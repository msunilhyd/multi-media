'use client';

import { Mail, Send } from 'lucide-react';
import Header from '@/components/Header';

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <Header />
      
      <main className="container mx-auto px-3 sm:px-4 py-6 sm:py-12">
        <div className="max-w-2xl mx-auto">
          {/* Page Title */}
          <div className="text-center mb-12">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-800 dark:text-white mb-3 sm:mb-4">
              Get in Touch
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-gray-600 dark:text-gray-400">
              We'd love to hear your suggestions and feedback
            </p>
          </div>

          {/* Contact Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 sm:p-8 mb-8">
            <div className="flex items-center justify-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                <Mail className="w-8 h-8 text-white" />
              </div>
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold text-center text-gray-900 dark:text-white mb-4">
              Send us your suggestions
            </h2>

            <p className="text-center text-gray-600 dark:text-gray-400 mb-8">
              Have an idea, found a bug, or want to share your thoughts? We'd love to hear from you!
            </p>

            {/* Email Link */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
              <a
                href="mailto:msunilhyd@gmail.com"
                className="flex items-center gap-3 px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all font-medium shadow-lg text-sm sm:text-base"
              >
                <Send className="w-5 h-5" />
                Send Email
              </a>
            </div>

            {/* Email Display */}
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 sm:p-6 text-center border border-gray-200 dark:border-gray-600">
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">Email us at:</p>
              <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white break-all">
                msunilhyd@gmail.com
              </p>
            </div>
          </div>

          {/* Info Cards */}
          <div className="grid md:grid-cols-3 gap-4 sm:gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 sm:p-6 text-center">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">💡</span>
              </div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-2">Suggestions</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Share your ideas to improve the platform
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 sm:p-6 text-center">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🐛</span>
              </div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-2">Bug Reports</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Help us fix issues and improve stability
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 sm:p-6 text-center">
              <div className="w-12 h-12 bg-pink-100 dark:bg-pink-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">❤️</span>
              </div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-2">Feedback</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Tell us what you think about LinusPlaylists
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-gray-800 text-white py-6 mt-12">
        <div className="container mx-auto px-4 text-center">
          <p className="text-gray-400">
            @LinusPlaylists.com
          </p>
        </div>
      </footer>
    </div>
  );
}
