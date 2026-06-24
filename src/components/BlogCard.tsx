import { Link } from '@tanstack/react-router'

export default function BlogCard(){
    return (
        <>
        <div className="flex flex-col gap-6">
          <div className="flex gap-4 rounded-xl shadow p-4">
            /blog1.jpg
            <div className="flex flex-col">
              <h3 className="text-lg font-semibold mt-1">
                <Link to="/page">
                Getting Started with FPGA Development
                </Link>
              </h3>
              <p className="text-sm mt-2">
                A beginner-friendly guide to understanding FPGA basics, tools, and how
                to start your journey in hardware programming.
              </p>
              <p className="mt-2 text-sm">
                Tags: FPGA Hardware Beginner
              </p>
              <p className="flex text-sm justify-end">June 12, 2026</p>
            </div>
          </div>
        </div>
        </>
    )
}