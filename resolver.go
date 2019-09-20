package gqlgen_todos

import (
	"context"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"
) // THIS CODE IS A STARTING POINT ONLY. IT WILL NOT BE UPDATED WITH SCHEMA CHANGES.

type Resolver struct{}

func (r *Resolver) Mutation() MutationResolver {
	return &mutationResolver{r}
}
func (r *Resolver) Query() QueryResolver {
	return &queryResolver{r}
}
func (r *Resolver) Subscription() SubscriptionResolver {
	return &subscriptionResolver{r}
}
func (r *Resolver) Todo() TodoResolver {
	return &todoResolver{r}
}

type mutationResolver struct{ *Resolver }

func (r *mutationResolver) CreateTodo(ctx context.Context, input NewTodo) (*Todo, error) {
	panic("not implemented")
}

type queryResolver struct{ *Resolver }

func (r *queryResolver) Todos(ctx context.Context) ([]*Todo, error) {
	panic("not implemented")
}

type subscriptionResolver struct{ *Resolver }

func (r *subscriptionResolver) TodoSubscribe(ctx context.Context) (<-chan *Todo, error) {
	todoChan := make(chan *Todo)
	sigchan := make(chan os.Signal, 1)
	signal.Notify(sigchan, syscall.SIGINT, syscall.SIGTERM)
	ticker := time.NewTicker(5 * time.Second)
	go func() {
		defer close(todoChan)
		for {
			select {
			case <-sigchan:
				return
			case <-ctx.Done():
				return
			case <-ticker.C:
				todoChan <- &Todo{ID: "abc123", Done:true, Text: "foo" }
			}
		}
	}()
	return todoChan, nil
}

type todoResolver struct{ *Resolver }

func (r *todoResolver) Foo(ctx context.Context, obj *Todo) (Foo, error) {
	resp, err := http.Get("https://pokeapi.co/api/v2")
	if err != nil{
		return nil, err
	}
	return Todo{
		Text: resp.Status,
	}, nil
}
func (r *todoResolver) Bar(ctx context.Context, obj *Todo) (Bar, error) {
	resp, err := http.Get("https://pokeapi.co/api/v2")
	if err != nil{
		return nil, err
	}
	return Todo{
		Text: resp.Status,
	}, nil
}
