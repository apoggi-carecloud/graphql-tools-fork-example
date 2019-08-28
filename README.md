gqlgen-todos

run subscription golang graphql service
```
go run cmd/server/server.go
```
run apollo server stitching service
```
node apollo_server/app.js
```

stitched server at http://localhost:3000/graphql

```
subscription{
  todoSubscribe_V2{
    id
    text
     done
  }
}
```

You should receive a message every 5 seconds you are subscribed.