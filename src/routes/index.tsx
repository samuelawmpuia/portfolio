import BlogCard from '#/components/BlogCard'
import { createFileRoute } from '@tanstack/react-router'


export const Route = createFileRoute('/')({
  component: App,
})

function App() {
  return (
    <>
      <div className="max-w-4xl mx-auto p-6">
        <h2 className="text-2xl font-bold mb-6">Blogz</h2>
        <BlogCard>
          
        </BlogCard>
      </div>
    </>
  )
}
