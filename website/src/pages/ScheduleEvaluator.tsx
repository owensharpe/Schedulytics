import React, { useState, useEffect, useMemo } from 'react';
import './ScheduleEvaluator.css';
import Modal from 'react-modal';
import { v4 as uuidv4 } from 'uuid';
import Papa from 'papaparse'; 
import Fuse from 'fuse.js'; 
import { ToastContainer, toast } from 'react-toastify'; 
import 'react-toastify/dist/ReactToastify.css'; 

Modal.setAppElement('#root');


interface ScheduleEvent {
  id: string;
  title: string;
  day: string;
  startTime: string;
  endTime: string;
  type: string;
  location?: string;
  instructor?: string;
}

interface TeacherData {
  'First Name': string;
  'Last Name': string;
  'Average Rating (Out of 5)': string;
  'Level of Difficulty (Out of 5)': string;
  'Popular Tags': string; // JSON stringified array
}


interface ProcessedTeacherData {
  averageRating: number | null;
  levelOfDifficulty: number | null;
  keywords: string[];
}

const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const hoursOfDay = Array.from({ length: 24 }, (_, i) => i);

const ScheduleEvaluator: React.FC = () => {
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [selectedSlot, setSelectedSlot] = useState<{ day: string; hour: number } | null>(null);

  const [importModalIsOpen, setImportModalIsOpen] = useState(false);
  const [importText, setImportText] = useState('');

  const [teachersData, setTeachersData] = useState<{ [name: string]: ProcessedTeacherData }>({});
  const [csvError, setCsvError] = useState<string | null>(null);

  const fuse = useMemo(() => {
    return new Fuse(Object.keys(teachersData), {
      includeScore: true,
      threshold: 0.4,
    });
  }, [teachersData]);

  useEffect(() => {
    const savedEvents = localStorage.getItem('scheduleEvents');
    if (savedEvents) {
      setEvents(JSON.parse(savedEvents));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('scheduleEvents', JSON.stringify(events));
  }, [events]);

  const parsePopularTags = (tagsStr: string, rowIndex: number, fullName: string): string[] => {
    try {
      const fixedTagsStr = tagsStr.replace(/'\s*'/g, "', '").replace(/'/g, '"');
      const popularTags: string[] = JSON.parse(fixedTagsStr);
      if (Array.isArray(popularTags)) {
        return popularTags;
      } else {
        console.warn(`Row ${rowIndex + 2}: 'Popular Tags' is not an array for ${fullName}.`);
        return [];
      }
    } catch (e) {
      console.error(`Row ${rowIndex + 2}: Error parsing 'Popular Tags' for ${fullName}:`, e);
      
   
      return [];
    }
  };


  useEffect(() => {
    Papa.parse<TeacherData>('/neu_rmp.csv', {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data;
        console.log('CSV Parsing Complete. Data:', data);
        const teacherMap: { [name: string]: ProcessedTeacherData } = {};

        data.forEach((row, index) => {
          const firstName = row['First Name']?.trim();
          const lastName = row['Last Name']?.trim();

    
          const fullName = [firstName, lastName].filter(Boolean).join(' ').trim().toLowerCase();

          if (!fullName) return;

  
          const avgRatingStr = row['Average Rating (Out of 5)'];
          const avgRating = parseFloat(avgRatingStr);
          const averageRating = !isNaN(avgRating) && avgRating > 0 ? avgRating : null;

          const levelDifficultyStr = row['Level of Difficulty (Out of 5)'];
          const levelDifficulty = parseFloat(levelDifficultyStr);
          const levelOfDifficulty = !isNaN(levelDifficulty) && levelDifficulty > 0 ? levelDifficulty : null;

 
          const popularTagsStr = row['Popular Tags'];
          let keywords: string[] = [];
          if (popularTagsStr && popularTagsStr !== "[]") {
            keywords = parsePopularTags(popularTagsStr, index, fullName);
          }

          teacherMap[fullName] = {
            averageRating,
            levelOfDifficulty,
            keywords: keywords.length > 0 ? keywords : ['N/A'],
          };
        });

        setTeachersData(teacherMap);
      },
      error: (error) => {
        setCsvError(`Error parsing CSV: ${error.message}`);
      },
    });
  }, []);

  const handleSlotClick = (day: string, hour: number) => {
    setSelectedSlot({ day, hour });
    setNewEventTitle('');
    setModalIsOpen(true);
  };

  const handleEventClick = (eventId: string) => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      setEvents(events.filter(event => event.id !== eventId));
      toast.info('Event deleted.');
    }
  };

  const handleModalSubmit = () => {
    if (selectedSlot && newEventTitle.trim() !== '') {
      const newEvent: ScheduleEvent = {
        id: uuidv4(),
        title: `${newEventTitle.trim()}`,
        day: selectedSlot.day,
        startTime: `${(selectedSlot.hour % 12) || 12}:00 ${selectedSlot.hour >= 12 ? 'PM' : 'AM'}`,
        endTime: `${((selectedSlot.hour + 1) % 12) || 12}:00 ${selectedSlot.hour + 1 >= 12 ? 'PM' : 'AM'}`,
        type: 'Custom Event',
      };
      setEvents([...events, newEvent]);
      toast.success('Event added successfully!');
    } else {
      toast.warn('Please enter a valid event title.');
    }
    setModalIsOpen(false);
    setSelectedSlot(null);
  };

  const handleModalClose = () => {
    setModalIsOpen(false);
    setSelectedSlot(null);
  };

  const parseScheduleText = (text: string): ScheduleEvent[] => {
    const parsedEvents: ScheduleEvent[] = [];
    const normalizedText = text.replace(/\r\n/g, '\n');
    const lines = normalizedText.split('\n');

    let currentCourseTitle = '';
    let currentDays: string[] = [];
    let currentClassEvents: ScheduleEvent[] = [];

    const courseTitleRegex = /^(.*?)\s*\|/;
    const daysLineRegex = /^(\d{2}\/\d{2}\/\d{4})\s*--\s*(\d{2}\/\d{2}\/\d{4})\s*(.*)$/;
    const eventRegex = /^\s*(\d{1,2}:\d{2}\s*[APM]{2})\s*-\s*(\d{1,2}:\d{2}\s*[APM]{2})\s*Type:\s*(Class|Final Exam)\s*Location:\s*(.*?)\s*Building:\s*(.*?)\s*Room:\s*(.*?)/;
    const instructorRegex = /^Instructor:\s*(.*)$/;

    lines.forEach((line) => {
      const trimmedLine = line.trim();

      if (trimmedLine === '') {
        return;
      }

      const courseMatch = trimmedLine.match(courseTitleRegex);
      if (courseMatch) {
        currentCourseTitle = courseMatch[1].trim();
        currentDays = [];
        currentClassEvents = [];
        return;
      }

      const daysMatch = trimmedLine.match(daysLineRegex);
      if (daysMatch) {
        const daysStr = daysMatch[3];
        currentDays = daysStr.split(',').map(day => day.trim());
        return;
      }

      const eventMatch = trimmedLine.match(eventRegex);
      if (eventMatch) {
        const [_, startTime, endTime, type, location, building, room] = eventMatch;
        let fullLocation = location.toLowerCase() !== 'none' ? `Location: ${location}, Building: ${building}, Room: ${room}` : 'Location Not Specified';

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
            instructor: undefined,
          };
          parsedEvents.push(event);
          currentClassEvents.push(event);
        });

        return;
      }

      // Updated instructor name handling
      const instructorMatch = trimmedLine.match(instructorRegex);
      if (instructorMatch && currentClassEvents.length > 0) {
        let instructorName = instructorMatch[1].trim();
        instructorName = instructorName.split('(')[0].trim();

        // Handle "Last, First" format
        if (instructorName.includes(',')) {
          const [lastName, firstName] = instructorName.split(',').map(s => s.trim());
          instructorName = `${firstName} ${lastName}`;
        }

        // Remove middle names or initials
        const nameParts = instructorName.split(' ').filter(Boolean);
        if (nameParts.length >= 2) {
          instructorName = `${nameParts[0]} ${nameParts[nameParts.length - 1]}`;
        } else {
          instructorName = nameParts[0];
        }

        // Normalize the instructor name
        instructorName = instructorName.toLowerCase();

        currentClassEvents.forEach(event => {
          event.instructor = instructorName;
        });
        return;
      }
    });

    return parsedEvents;
  };

  const uniqueTeachers = useMemo(() => {
    const teachers = events
      .map(event => event.instructor)
      .filter((instructor): instructor is string => Boolean(instructor))
      .map(instructor => instructor.trim().toLowerCase());
    return Array.from(new Set(teachers));
  }, [events]);

  const enrichedTeachers = useMemo(() => {
    return uniqueTeachers.map(teacherName => {
      const match = fuse.search(teacherName);
      const matchedTeacher = match.length > 0 ? match[0].item : null;
      const teacherInfo = matchedTeacher ? teachersData[matchedTeacher] : undefined;
      return {
        name: teacherName.split(' ').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' '),
        averageRating: teacherInfo && teacherInfo.averageRating !== null ? teacherInfo.averageRating : 'N/A',
        levelOfDifficulty: teacherInfo && teacherInfo.levelOfDifficulty !== null ? teacherInfo.levelOfDifficulty : 'N/A',
        keywords: teacherInfo && teacherInfo.keywords.length > 0 ? teacherInfo.keywords : ['N/A'],
      };
    });
  }, [uniqueTeachers, teachersData, fuse]);

  // New function to clear all events
  const clearAllEvents = () => {
    if (window.confirm('Are you sure you want to clear all events from your schedule? This action cannot be undone.')) {
      setEvents([]);
      toast.info('All events have been cleared.');
    }
  };

  // New useMemo hooks to calculate average rating and difficulty
  const averageRating = useMemo(() => {
    const ratings = enrichedTeachers
      .map(teacher => typeof teacher.averageRating === 'number' ? teacher.averageRating : null)
      .filter((rating): rating is number => rating !== null);
    if (ratings.length === 0) return 'N/A';
    const sum = ratings.reduce((a, b) => a + b, 0);
    return (sum / ratings.length).toFixed(1);
  }, [enrichedTeachers]);

  const averageDifficulty = useMemo(() => {
    const difficulties = enrichedTeachers
      .map(teacher => typeof teacher.levelOfDifficulty === 'number' ? teacher.levelOfDifficulty : null)
      .filter((difficulty): difficulty is number => difficulty !== null);
    if (difficulties.length === 0) return 'N/A';
    const sum = difficulties.reduce((a, b) => a + b, 0);
    return (sum / difficulties.length).toFixed(1);
  }, [enrichedTeachers]);

  return (
    <div className="schedule-evaluator">
      <h2>Weekly Schedule Evaluator</h2>

      <ToastContainer />

      {csvError && <p className="error">{csvError}</p>}

      <div className="button-group">
        <button onClick={() => setImportModalIsOpen(true)} className="import-button">
          Import Schedule
        </button>
        <button
          onClick={clearAllEvents}
          className="clear-button"
          disabled={events.length === 0}
          aria-disabled={events.length === 0}
        >
          Clear Schedule
        </button>
      </div>

      <div className="schedule-grid">
        <div className="header-cell time-cell">Time</div>
        {daysOfWeek.map(day => (
          <div key={day} className="header-cell day-cell">
            {day}
          </div>
        ))}

        {hoursOfDay.map(hour => (
          <React.Fragment key={hour}>
            <div className="time-cell">{hour}:00</div>
            {daysOfWeek.map(day => {
              const event = events.find(ev => {
                const [startHourStr, startMinutePart] = ev.startTime.split(':');
                let startHour = parseInt(startHourStr);
                const period = startMinutePart.slice(-2);
                if (period === 'PM' && startHour !== 12) startHour += 12;
                if (period === 'AM' && startHour === 12) startHour = 0;
                return ev.day === day && startHour === hour;
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
                      onClick={e => {
                        e.stopPropagation();
                        handleEventClick(event.id);
                      }}
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

      <div className="teacher-section">
        <h3>Teachers</h3>

        {/* New Averages Display */}
        <div className="teacher-averages">
          <p><strong>Average Rating:</strong> {averageRating !== 'N/A' ? averageRating : 'N/A'}</p>
          <p><strong>Average Level of Difficulty:</strong> {averageDifficulty !== 'N/A' ? averageDifficulty : 'N/A'}</p>
        </div>

        <div className="teacher-list">
          {enrichedTeachers.length > 0 ? (
            enrichedTeachers.map((teacher, index) => (
              <div key={index} className="teacher-item">
                <strong>{teacher.name}</strong><br />
                Average Rating: {teacher.averageRating !== 'N/A' ? teacher.averageRating : 'N/A'}<br />
                Level of Difficulty: {teacher.levelOfDifficulty !== 'N/A' ? teacher.levelOfDifficulty : 'N/A'}<br />
                Keywords: {teacher.keywords.join(', ')}
              </div>
            ))
          ) : (
            <p>No teachers available.</p>
          )}
        </div>
      </div>

      <Modal
        isOpen={modalIsOpen}
        onRequestClose={handleModalClose}
        contentLabel="Add Event"
        className="modal"
        overlayClassName="overlay"
      >
        <h2>Add Class</h2>
        {selectedSlot && (
          <p>{selectedSlot.day} at {selectedSlot.hour}:00</p>
        )}
        <input
          type="text"
          value={newEventTitle}
          onChange={e => setNewEventTitle(e.target.value)}
          placeholder="Event Title"
        />
        <div className="modal-buttons">
          <button onClick={handleModalSubmit}>Add Class</button>
          <button onClick={handleModalClose} className="cancel">Cancel</button>
        </div>
      </Modal>

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
          onChange={e => setImportText(e.target.value)}
          placeholder="Paste your schedule text here"
          rows={15}
        />
        <div className="modal-buttons">
          <button onClick={() => {
            const importedEvents = parseScheduleText(importText);
            if (importedEvents.length > 0) {
              setEvents([...events, ...importedEvents]);
              toast.success('Schedule imported successfully!');
            } else {
              toast.warn('No events were imported. Please check your schedule text.');
            }
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

