'use client';

export default function OfflinePageClient() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="mb-6">
          <div className="w-20 h-20 mx-auto bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">You&apos;re Offline</h1>
          <p className="text-gray-600">
            SecureShare needs an internet connection to work properly. 
            Please check your connection and try again.
          </p>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            Try Again
          </button>
          
          <div className="text-sm text-gray-500">
            <p className="mb-2">While offline, you can:</p>
            <ul className="list-disc list-inside space-y-1 text-left">
              <li>View previously loaded files</li>
              <li>Browse cached content</li>
              <li>Queue files for upload when back online</li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-400">
            SecureShare works best with a stable internet connection
          </p>
        </div>
      </div>
    </div>
  );
}
