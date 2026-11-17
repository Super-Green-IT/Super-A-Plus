import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <section className="flex min-h-[60vh] items-center justify-center px-4 py-16 text-center">
      <div className="max-w-md">
        <p className="text-6xl font-semibold tracking-tight text-emerald-900">404</p>
        <div className="mx-auto my-6 h-px w-16 bg-slate-300" />
        <h1 className="text-xl font-semibold text-slate-800">Page not found</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          The page you’re looking for may have moved or no longer exists.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-md bg-emerald-900 px-4 text-sm font-medium text-white transition-colors hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Return to dashboard
        </Link>
      </div>
    </section>
  )
}
