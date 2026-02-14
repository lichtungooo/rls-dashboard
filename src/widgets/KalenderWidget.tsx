/**
 * Kalender-Widget - scrollbar, zeigt Events
 */

export function KalenderWidget() {
  const upcomingEvents = [
    {
      title: 'Team Meeting',
      date: 'Morgen, 10:00 Uhr',
      location: 'Auf der Karte markiert',
      color: 'blue',
    },
    {
      title: 'Workshop: System-Architektur',
      date: 'Mittwoch, 14:00 Uhr',
      location: 'Gemeinschaftsgarten',
      color: 'green',
    },
    {
      title: '1:1 mit Anton',
      date: 'Freitag, 16:00 Uhr',
      location: 'Repair Café',
      color: 'purple',
    },
  ]

  return (
    <div className="widget h-full flex flex-col p-4 overflow-hidden">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200">
        <h3 className="font-semibold text-gray-800">📅 Kalender</h3>
        <button className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">
          + Event
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2">
        {upcomingEvents.map((event, i) => (
          <div
            key={i}
            className={`border-l-4 border-${event.color}-500 pl-3 py-2 bg-${event.color}-50 rounded-r-lg hover:bg-${event.color}-100 transition-colors cursor-pointer`}
          >
            <h4 className="font-semibold text-gray-800 text-sm">{event.title}</h4>
            <p className="text-xs text-gray-600">{event.date}</p>
            <p className="text-xs text-gray-500">📍 {event.location}</p>
          </div>
        ))}

        <div className="mt-4 pt-4 border-t border-gray-200">
          <button className="w-full text-sm text-blue-600 hover:text-blue-700 transition-colors">
            Alle Termine anzeigen →
          </button>
        </div>
      </div>
    </div>
  )
}
