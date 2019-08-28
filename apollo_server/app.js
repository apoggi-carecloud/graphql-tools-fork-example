const { ApolloServer } = require('apollo-server-express');
const { setContext } = require('apollo-link-context');
const { createServer } = require('http');
const express = require('express');
const { HttpLink } = require('apollo-link-http');
const fetch = require('node-fetch');
const { SubscriptionClient } = require('subscriptions-transport-ws');
const ws = require('ws');
const { split } = require('apollo-client-preset');
const { getMainDefinition } = require('apollo-utilities');
const { transformSchema, FilterRootFields, RenameRootFields, RenameTypes, makeRemoteExecutableSchema, introspectSchema, makeExecutableSchema, mergeSchemas } = require('graphql-tools');

const port = process.env.CONFIG_HTTP_PORT || 3000;

const typeDefs = `
type Author {
  id: ID! # the ! means that every author object _must_ have an id
  firstName: String
  lastName: String
  """
  the list of Posts by this author
  """
  posts: [Post]
}

type Post {
  id: ID!
  title: String
  author: Author
  votes: Int
}

# the schema allows the following query:
type Query {
  posts: [Post]
}

# this schema allows the following mutation:
type Mutation {
  upvotePost (
    postId: ID!
  ): Post
}

# we need to tell the server which types represent the root query
# and root mutation types. We call them RootQuery and RootMutation by convention.
schema {
  query: Query
  mutation: Mutation
}
`
const resolvers = {
    Query: {
        posts() {
            return posts;
        },
    },
    Mutation: {
        upvotePost(_, { postId }) {
            const post = find(posts, { id: postId });
            if (!post) {
                throw new Error(`Couldn't find post with id ${postId}`);
            }
            post.votes += 1;
            return post;
        },
    },
    Author: {
        posts(author) {
            return filter(posts, { authorId: author.id });
        },
    },
    Post: {
        author(post) {
            return find(authors, { id: post.authorId });
        },
    },
};

const removeMutations = new FilterRootFields(operation => operation !== 'Mutation');

const renameRootFields = ({ term, prefixNotSuffix }) =>
    new RenameRootFields((operation, name) => (prefixNotSuffix ? `${term}${name}` : `${name}${term}`));

const renameTypes = ({ term, prefixNotSuffix }) =>
    new RenameTypes(name => (prefixNotSuffix ? `${term}${name}` : `${name}${term}`));

const removeMutationsSuffixV2 = schema =>
    transformSchema(schema, [
        removeMutations,
        renameRootFields({ term: '_V2', prefixNotSuffix: false }),
        renameTypes({ term: '_V2', prefixNotSuffix: false }),
    ]);

const getRemoteSchema = async ({ uri = 'http://localhost:8080/query', subUri = 'ws://localhost:8080/query', options = {}, customContext }) => {
    const httpLink = new HttpLink({ uri, fetch, ...options });
    const contextedLink = setContext(() => ({}));
    let link = null;

    if (subUri) {
        const wsLink = (operation, forward) => {
            const context = operation.getContext();
            const connectionParams = {};
            const client = new SubscriptionClient(
                subUri,
                {
                    connectionParams,
                    reconnect: true,
                },
                ws
            );
            return client.request(operation);
        };

        link = contextedLink.concat(
            split(
                ({ query }) => {
                    const { kind, operation } = getMainDefinition(query);
                    return kind === 'OperationDefinition' && operation === 'subscription';
                },
                wsLink,
                httpLink
            )
        );
    } else {
        link = contextedLink.concat(httpLink);
    }

    const schema = await introspectSchema(link);

    return makeRemoteExecutableSchema({
        schema,
        link,
    });
};

const fetchSchema = async () => {
    const schema = makeExecutableSchema({
        typeDefs,
        resolvers,
    });
    let remoteSchema = await getRemoteSchema({});
    return mergeSchemas({
        schemas: [
            schema,
            removeMutationsSuffixV2(remoteSchema)
        ],
    });
}

const start = async () => {

    const app = express();

    const server = new ApolloServer({
        schema: await fetchSchema(),
        introspection: true,
        tracing: true,
        path: '/graphql',
        subscriptions: {
            path: '/subscriptions',
        },
        disableHealthCheck: false,
        onHealthCheck: () => {
            return Promise.resolve(true);
        },
    });

    server.applyMiddleware({ app });

    const httpServer = createServer(app);
    server.installSubscriptionHandlers(httpServer);

    httpServer.listen(port, () => {
        console.log(`🚀 Server ready at http://localhost:${port}${server.graphqlPath}`);
        console.log(`🚀 Subscriptions ready at ws://localhost:${port}${server.subscriptionsPath}`);
        console.log(`🚀 Apollo Server Health Check: http://localhost:${port}/.well-known/apollo/server-health`);
    });
};
start();

module.exports = start;
