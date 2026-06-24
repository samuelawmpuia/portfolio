import { Link } from '@tanstack/react-router'

export default function Header() {
  return (
    <header>
      <div className="relative flex items-center justify-between p-4 bg-gray-900 text-white h-64">
      {/* Left: Profile */}
        <div className="absolute flex items-center gap-4 left-64">
          <img
            src="/pp.jpg"
            alt="Profile Picture"
            className="w-36 h-36 rounded-full object-cover border-2 border-white"
          />
          <span className="relative text-lg font-semibold left-5">Samuel Lalawmpuia</span>
        </div>
        {/* Right: Links */}

        <div className="absolute flex items-center gap-6 right-64">
          <Link to="/" className="hover:text-gray-300 transition">
            Blogz
          </Link>

          <Link to="/projects" className="hover:text-gray-300 transition">
            Projekz
          </Link>

          <Link to="/experience" className="hover:text-gray-300 transition">
            Experience
          </Link>

        </div>
      </div>
    </header>
  )
}
