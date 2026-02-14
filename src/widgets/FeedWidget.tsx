/**
 * Feed-Widget - scrollbar, zeigt Community-Posts
 */

export function FeedWidget() {
  const posts = [
    {
      author: 'Anna Schmidt',
      avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
      content: 'Wer hat Lust auf einen gemeinsamen Spaziergang im Park am Samstag?',
      time: 'vor 2 Stunden',
      likes: 5,
      comments: 3,
    },
    {
      author: 'Thomas Müller',
      avatar: 'https://randomuser.me/api/portraits/men/67.jpg',
      content: 'Suche jemanden der mir beim Umzug nächste Woche helfen kann. Biete Pizza!',
      time: 'gestern',
      likes: 3,
      comments: 7,
    },
    {
      author: 'Lisa Weber',
      avatar: 'https://randomuser.me/api/portraits/women/28.jpg',
      content: 'Hat jemand Erfahrung mit Urban Gardening? Suche Tipps für Anfänger.',
      time: 'gestern',
      likes: 8,
      comments: 12,
    },
  ]

  return (
    <div className="widget h-full flex flex-col p-4 overflow-hidden">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200">
        <h3 className="font-semibold text-gray-800">📰 Community Feed</h3>
        <button className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700">
          + Post
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3">
        {posts.map((post, i) => (
          <div key={i} className="bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <img
                src={post.avatar}
                alt={post.author}
                className="w-8 h-8 rounded-full"
              />
              <div className="flex-1">
                <h4 className="font-semibold text-gray-800 text-sm">{post.author}</h4>
                <p className="text-xs text-gray-500">{post.time}</p>
              </div>
            </div>

            <p className="text-sm text-gray-700 mb-2">{post.content}</p>

            <div className="flex items-center gap-4 text-xs text-gray-500">
              <button className="hover:text-blue-600">
                ❤️ {post.likes}
              </button>
              <button className="hover:text-blue-600">
                💬 {post.comments}
              </button>
              <button className="hover:text-blue-600">
                🔗 Teilen
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
