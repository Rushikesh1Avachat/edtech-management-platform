const GithubIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

const LinkedinIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect x="2" y="9" width="4" height="12" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

export default function Footer() {
  const devName = process.env.NEXT_PUBLIC_DEV_NAME || 'Rushikesh Avachat';
  const githubUrl = process.env.NEXT_PUBLIC_GITHUB_URL || 'https://github.com/RushikeshAvachat';
  const linkedinUrl = process.env.NEXT_PUBLIC_LINKEDIN_URL || 'https://linkedin.com/in/rushikesh-avachat';

  return (
    <footer className="mt-auto border-t border-gray-800/80 bg-gray-950/80 backdrop-blur-md text-gray-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg gradient-bg flex items-center justify-center text-white text-xs font-bold">
              ET
            </div>
            <span className="font-semibold text-white tracking-tight">EduTrack AI</span>
            <span className="text-xs text-gray-500">| House of Edtech Fullstack Assessment</span>
          </div>

          {/* Mandatory Assessment Footer Requirements (Step 15) */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
            <span className="text-gray-300 font-medium">Developed by {devName}</span>
            <span className="text-gray-600">•</span>
            <a
              href={githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors group"
            >
              <GithubIcon className="w-4 h-4 group-hover:text-purple-400 transition-colors" />
              <span>GitHub</span>
            </a>
            <span className="text-gray-600">•</span>
            <a
              href={linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors group"
            >
              <LinkedinIcon className="w-4 h-4 group-hover:text-blue-400 transition-colors" />
              <span>LinkedIn</span>
            </a>
          </div>

          <div className="text-xs text-gray-500">
            © {new Date().getFullYear()} EduTrack AI. Next.js 16 & PostgreSQL + Drizzle ORM.
          </div>
        </div>
      </div>
    </footer>
  );
}
