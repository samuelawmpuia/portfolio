import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/experience')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/experiene"!</div>
}
