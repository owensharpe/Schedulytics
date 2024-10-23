// ScheduleEvaluator.tsx
import React, { useState, useEffect, useMemo } from 'react';
import './ScheduleEvaluator.css';
import Modal from 'react-modal';
import { v4 as uuidv4 } from 'uuid';

// Set the root element for accessibility purposes
Modal.setAppElement('#root');

// Define the structure of an Event
interface ScheduleEvent {
  id: string;
  title: string;
  day: string; // e.g., 'Monday'
  startTime: string; // e.g., '10:30 AM'
  endTime: string;   // e.g., '11:35 AM'
  type: string;      // e.g., 'Class' or 'Final Exam' or 'Custom Event'
  location?: string;
  instructor?: string;
}

const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const hoursOfDay = Array.from({ length: 24 }, (_, i) => i); // 0 to 23

const ScheduleEvaluator: React.FC = () => {
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [selectedSlot, setSelectedSlot] = useState<{ day: string; hour: number } | null>(null);

  // Import Modal State
  const [importModalIsOpen, setImportModalIsOpen] = useState(false);
  const [importText, setImportText] = useState('');

  // Load events from localStorage on component mount
  useEffect(() => {
    const savedEvents = localStorage.getItem('scheduleEvents');
    if (savedEvents) {
      setEvents(JSON.parse(savedEvents));
    }
  }, []);

  // Save events to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('scheduleEvents', JSON.stringify(events));
  }, [events]);

  // Handle clicking on a time slot to add an event
  const handleSlotClick = (day: string, hour: number) => {
    setSelectedSlot({ day, hour });
    setNewEventTitle('');
    setModalIsOpen(true);
  };

  // Handle clicking on an existing event to delete it
  const handleEventClick = (eventId: string) => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      setEvents(events.filter(event => event.id !== eventId));
    }
  };

  // Handle modal submission to add a new event
  const handleModalSubmit = () => {
    if (selectedSlot && newEventTitle.trim() !== '') {
      // For simplicity, set a default duration of 1 hour
      const newEvent: ScheduleEvent = {
        id: uuidv4(),
        title: newEventTitle.trim(),
        day: selectedSlot.day,
        startTime: `${selectedSlot.hour % 12 || 12}:00 ${selectedSlot.hour >= 12 ? 'PM' : 'AM'}`,
        endTime: `${(selectedSlot.hour + 1) % 12 || 12}:00 ${selectedSlot.hour + 1 >= 12 ? 'PM' : 'AM'}`,
        type: 'Custom Event',
      };
      setEvents([...events, newEvent]);
    }
    setModalIsOpen(false);
    setSelectedSlot(null);
  };

  // Handle modal closure without adding an event
  const handleModalClose = () => {
    setModalIsOpen(false);
    setSelectedSlot(null);
  };

  // Enhanced Parser Function
  const parseScheduleText = (text: string): ScheduleEvent[] => {
    const parsedEvents: ScheduleEvent[] = [];

    // Normalize newlines to handle both \n and \r\n
    const normalizedText = text.replace(/\r\n/g, '\n');

    // Split the input text into lines
    const lines = normalizedText.split('\n');

    let currentCourseTitle = '';
    let currentDays: string[] = [];
    let currentClassEvents: ScheduleEvent[] = [];

    // Regular expressions to identify course titles and event details
    const courseTitleRegex = /^(.*?)\s*\|/;
    const daysLineRegex = /^(\d{2}\/\d{2}\/\d{4})\s*--\s*(\d{2}\/\d{2}\/\d{4})\s*(.*)$/;
    const eventRegex = /^\s*(\d{1,2}:\d{2}\s*[APM]{2})\s*-\s*(\d{1,2}:\d{2}\s*[APM]{2})\s*Type:\s*(Class|Final Exam)\s*Location:\s*(.*?)\s*Building:\s*(.*?)\s*Room:\s*(.*?)/;
    const instructorRegex = /^Instructor:\s*(.*)$/;
    const crnRegex = /^CRN:\s*(\d+)$/;

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();

      if (trimmedLine === '') {
        // Skip empty lines
        return;
      }

      // Check if the line is a course title
      const courseMatch = trimmedLine.match(courseTitleRegex);
      if (courseMatch) {
        currentCourseTitle = courseMatch[1].trim();
        currentDays = []; // Reset days for the new course
        currentClassEvents = []; // Reset current class events

        console.log(`\nParsing Course ${index + 1}: ${currentCourseTitle}`);

        return;
      }

      // Check if the line is a days line
      const daysMatch = trimmedLine.match(daysLineRegex);
      if (daysMatch) {
        const daysStr = daysMatch[3]; // Extract the days portion
        currentDays = daysStr.split(',').map(day => day.trim());

        console.log(`\tDays for current event: ${currentDays.join(', ')}`);

        return;
      }

      // Check if the line is an event line
      const eventMatch = trimmedLine.match(eventRegex);
      if (eventMatch) {
        const [
          _, // full match
          startTime,
          endTime,
          type,
          location,
          building,
          room
        ] = eventMatch;

        console.log(`\tFound Event: ${startTime} - ${endTime}, Type: ${type}`);

        // Construct the full location string if available
        let fullLocation = '';
        if (location.toLowerCase() !== 'none') {
          fullLocation = `Location: ${location}, Building: ${building}, Room: ${room}`;
        } else {
          fullLocation = 'Location Not Specified';
        }

        // Create an event for each day
        currentDays.forEach(day => {
          const formattedDay = day.charAt(0).toUpperCase() + day.slice(1).toLowerCase();
          const event: ScheduleEvent = {
            id: uuidv4(),
            title: `${currentCourseTitle} (${type})`,
            day: formattedDay,
            startTime,
            endTime,
            type,
            location: fullLocation !== 'Location Not Specified' ? fullLocation : undefined,
            instructor: undefined, // To be filled in if available
          };
          parsedEvents.push(event);
          currentClassEvents.push(event); // Keep track of all events for this class
        });

        return;
      }

      // Check if the line is an instructor line
      const instructorMatch = trimmedLine.match(instructorRegex);
      if (instructorMatch && currentClassEvents.length > 0) {
        let instructorName = instructorMatch[1].trim();
        // Remove any text within parentheses, e.g., " (Primary)"
        instructorName = instructorName.split('(')[0].trim();

        console.log(`\t\tFound Instructor: ${instructorName}`);

        // Assign the instructor to all current class events
        currentClassEvents.forEach(event => {
          event.instructor = instructorName;
        });

        return;
      }

      // Optional: Handle CRN lines if needed
      const crnMatch = trimmedLine.match(crnRegex);
      if (crnMatch) {
        const crn = crnMatch[1];
        console.log(`\t\tFound CRN: ${crn}`);
        // Currently, CRN is not used. You can extend functionality as needed.
        return;
      }

      // If the line doesn't match any known pattern, skip it
    });

    console.log('Parsed Events:', parsedEvents);
    return parsedEvents;
  };

  // Extract unique teachers from events
  const uniqueTeachers = useMemo(() => {
    const teachers = events
      .map(event => event.instructor)
      .filter((instructor): instructor is string => Boolean(instructor))
      .map(instructor => {
        // Remove any text within parentheses (e.g., " (Primary)")
        const cleaned = instructor.split('(')[0].trim();
        return cleaned;
      });
    return Array.from(new Set(teachers));
  }, [events]);

  return (
    <div className="schedule-evaluator">
      <h2>Weekly Schedule Evaluator</h2>
      
      {/* Import Button */}
      <button onClick={() => setImportModalIsOpen(true)} className="import-button">
        Import Schedule
      </button>

      {/* Schedule Grid */}
      <div className="schedule-grid">
        {/* Render the header with days of the week */}
        <div className="header-cell time-cell">Time</div>
        {daysOfWeek.map(day => (
          <div key={day} className="header-cell day-cell">
            {day}
          </div>
        ))}

        {/* Render the grid for each hour and day */}
        {hoursOfDay.map(hour => (
          <React.Fragment key={hour}>
            {/* Time label */}
            <div className="time-cell">
              {hour}:00
            </div>
            {/* Time slots for each day */}
            {daysOfWeek.map(day => {
              // Find events that start at this hour on this day
              const event = events.find(ev => {
                const [startHour, startMinutePart] = ev.startTime.split(':');
                let parsedStartHour = parseInt(startHour);
                const period = startMinutePart.slice(-2); // AM or PM
                if (period === 'PM' && parsedStartHour !== 12) parsedStartHour += 12;
                if (period === 'AM' && parsedStartHour === 12) parsedStartHour = 0;
                return ev.day === day && parsedStartHour === hour;
              });

              return (
                <div
                  key={`${day}-${hour}`}
                  className={`day-cell slot ${event ? 'has-event' : ''}`}
                  onClick={() => !event && handleSlotClick(day, hour)}
                >
                  {event && (
                    <div
                      className="event"
                      data-type={event.type}
                      onClick={(e) => { e.stopPropagation(); handleEventClick(event.id); }}
                      title={`${event.title}\n${event.startTime} - ${event.endTime}`}
                    >
                      {event.title} ({event.startTime} - {event.endTime})
                    </div>
                  )}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>

      {/* Teacher Section */}
      <div className="teacher-section">
        <h3>Teachers</h3>
        <div className="teacher-list">
          {uniqueTeachers.length > 0 ? (
            uniqueTeachers.map((teacher, index) => (
              <div key={index} className="teacher-item">
                {teacher}
              </div>
            ))
          ) : (
            <p>No teachers available.</p>
          )}
        </div>
      </div>

      {/* Modal for adding a new event */}
      <Modal
        isOpen={modalIsOpen}
        onRequestClose={handleModalClose}
        contentLabel="Add Event"
        className="modal"
        overlayClassName="overlay"
      >
        <h2>Add Event</h2>
        {selectedSlot && (
          <p>
            {selectedSlot.day} at {selectedSlot.hour}:00
          </p>
        )}
        <input
          type="text"
          value={newEventTitle}
          onChange={(e) => setNewEventTitle(e.target.value)}
          placeholder="Event Title"
        />
        <div className="modal-buttons">
          <button onClick={handleModalSubmit}>Add Event</button>
          <button onClick={handleModalClose} className="cancel">Cancel</button>
        </div>
      </Modal>

      {/* Import Modal */}
      <Modal
        isOpen={importModalIsOpen}
        onRequestClose={() => setImportModalIsOpen(false)}
        contentLabel="Import Schedule"
        className="modal"
        overlayClassName="overlay"
      >
        <h2>Import Schedule</h2>
        <textarea
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          placeholder="Paste your schedule text here"
          rows={15}
        />
        <div className="modal-buttons">
          <button onClick={() => {
            const importedEvents = parseScheduleText(importText);
            setEvents([...events, ...importedEvents]);
            setImportText('');
            setImportModalIsOpen(false);
          }}>
            Import
          </button>
          <button onClick={() => { setImportModalIsOpen(false); setImportText(''); }} className="cancel">
            Cancel
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default ScheduleEvaluator;
