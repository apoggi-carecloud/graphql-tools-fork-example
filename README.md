gqlgen-todos

run subscription golang graphql service
```
go run cmd/server/server.go
```

```
subscription{
  todoSubscribe{
    id
    foo{
      ...on Todo{
        text
      }
    }
  }
} 
```
GraphQL server available at http://localhost:4003.
You should receive a message every 5 seconds you are subscribed. ID does not properly resolve.