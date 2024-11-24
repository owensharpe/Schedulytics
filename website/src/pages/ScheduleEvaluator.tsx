import React, { useState, useEffect, useMemo } from 'react';
import './ScheduleEvaluator.css';
import Modal from 'react-modal';
import { v4 as uuidv4 } from 'uuid';
import Fuse from 'fuse.js'; 
import { ToastContainer, toast } from 'react-toastify'; 
import 'react-toastify/dist/ReactToastify.css'; 
import { createClient } from '@supabase/supabase-js';

Modal.setAppElement('#root');

interface ScheduleEvent {
  id: string;
  courseTitle: string;
  instructor: string;
  day: string;
  startTime: string;
  endTime: string;
  type: string;
}

interface CourseData {
  course_id: string;
  course_title: string;
  instructor: string;
  professor_score: number | null;
}

interface ProcessedCourseData {
  id: string;
  courseTitle: string;
  instructor: string;
  professorScore: number | null;
}

const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const hoursOfDay = Array.from({ length: 24 }, (_, i) => i);

// Initialize Supabase client using the anonymous key
const supabaseUrl = 'https://rjjutfjplchrhxtzylay.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJqanV0ZmpwbGNocmh4dHp5bGF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjk0NDIxMDUsImV4cCI6MjA0NTAxODEwNX0.xNPBkKIITWtXDvBLMShaUu65hIZGa5dL2rQPxzLTRNA';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const ScheduleEvaluator: React.FC = () => {
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ day: string; hour: number } | null>(null);

  const [coursesData, setCoursesData] = useState<ProcessedCourseData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [courseFuse, setCourseFuse] = useState<Fuse<ProcessedCourseData>>();

  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    const savedEvents = localStorage.getItem('scheduleEvents');
    if (savedEvents) {
      setEvents(JSON.parse(savedEvents));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('scheduleEvents', JSON.stringify(events));
  }, [events]);

  useEffect(() => {
    // Fetch course data from Supabase
    const fetchCourses = async () => {
      const { data, error } = await supabase
        .from<CourseData>('trace_evals') // Replace 'courses' with your actual table name
        .select('course_id, course_title, instructor, professor_score');

      if (error) {
        setFetchError(`Error fetching data from Supabase: ${error.message}`);
      } else if (data) {
        // Process data
        const processedCourses: ProcessedCourseData[] = data.map((course) => ({
          id: course.course_id,
          courseTitle: course.course_title.trim(),
          instructor: course.instructor.trim(),
          professorScore: course.professor_score,
        }));

        setCoursesData(processedCourses);

        // Initialize Fuse for search
        const fuse = new Fuse(processedCourses, {
          keys: ['courseTitle', 'instructor'],
          threshold: 0.3,
        });
        setCourseFuse(fuse);
      }
    };

    fetchCourses();
  }, []);

  const handleSlotClick = (day: string, hour: number) => {
    setSelectedSlot({ day, hour });
    setSearchQuery('');
    setModalIsOpen(true);
  };

  const handleEventClick = (eventId: string) => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      setEvents(events.filter(event => event.id !== eventId));
      toast.info('Event deleted.');
    }
  };

  const handleModalClose = () => {
    setModalIsOpen(false);
    setSelectedSlot(null);
  };

  const clearAllEvents = () => {
    if (window.confirm('Are you sure you want to clear all events from your schedule? This action cannot be undone.')) {
      setEvents([]);
      toast.info('All events have been cleared.');
    }
  };

  const filteredCourses = useMemo(() => {
    if (!searchQuery || !courseFuse) return [];
    const results = courseFuse.search(searchQuery, { limit: 3 }); // Limit to top 3 results
    return results.map(result => result.item);
  }, [searchQuery, courseFuse]);

  const handleCourseSelect = (selectedCourse: ProcessedCourseData) => {
    if (selectedSlot) {
      const newEvent: ScheduleEvent = {
        id: uuidv4(),
        courseTitle: selectedCourse.courseTitle,
        instructor: selectedCourse.instructor,
        day: selectedSlot.day,
        startTime: `${(selectedSlot.hour % 12) || 12}:00 ${selectedSlot.hour >= 12 ? 'PM' : 'AM'}`,
        endTime: `${((selectedSlot.hour + 1) % 12) || 12}:00 ${selectedSlot.hour + 1 >= 12 ? 'PM' : 'AM'}`,
        type: 'Course',
      };
      setEvents([...events, newEvent]);
      toast.success('Course added to schedule!');
      setModalIsOpen(false);
      setSelectedSlot(null);
      setSearchQuery('');
    }
  };

  const uniqueInstructors = useMemo(() => {
    const instructorNames = events
      .map(event => event.instructor)
      .filter((name): name is string => Boolean(name))
      .map(name => name.trim());

    const uniqueNames = Array.from(new Set(instructorNames));

    return uniqueNames.map(name => {
      const instructorCourses = coursesData.filter(c => c.instructor === name);
      const professorScores = instructorCourses
        .map(c => c.professorScore)
        .filter((score): score is number => score !== null);

      const averageScore =
        professorScores.length > 0
          ? parseFloat((professorScores.reduce((a, b) => a + b, 0) / professorScores.length).toFixed(1))
          : null;

      return { fullName: name, professorScore: averageScore };
    });
  }, [events, coursesData]);

  const averageProfessorScore = useMemo(() => {
    const scores = uniqueInstructors
      .map(instructor => typeof instructor.professorScore === 'number' ? instructor.professorScore : null)
      .filter((score): score is number => score !== null);
    if (scores.length === 0) return 'N/A';
    const sum = scores.reduce((a, b) => a + b, 0);
    return (sum / scores.length).toFixed(1);
  }, [uniqueInstructors]);

  return (
    <div className="schedule-evaluator">
      <h2>Weekly Schedule Evaluator</h2>

      <ToastContainer />

      {fetchError && <p className="error">{fetchError}</p>}

      <div className="button-group">
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
                      title={`${event.courseTitle}\n${event.instructor}\n${event.startTime} - ${event.endTime}`}
                    >
                      {event.courseTitle} - {event.instructor} ({event.startTime} - {event.endTime})
                    </div>
                  )}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>

      <div className="teacher-section">
        <h3>Instructors</h3>

        {/* New Average Professor Score Display */}
        <div className="teacher-averages">
          <p><strong>Average Professor Score:</strong> {averageProfessorScore !== 'N/A' ? averageProfessorScore : 'N/A'}</p>
        </div>

        <div className="teacher-list">
          {uniqueInstructors.length > 0 ? (
            uniqueInstructors.map((instructor, index) => (
              <div key={index} className="teacher-item">
                <strong>{instructor.fullName}</strong><br />
                Professor Score: {instructor.professorScore !== null ? instructor.professorScore : 'N/A'}
              </div>
            ))
          ) : (
            <p>No instructors available.</p>
          )}
        </div>
      </div>

      <Modal
        isOpen={modalIsOpen}
        onRequestClose={handleModalClose}
        contentLabel="Add Course or Instructor"
        className="modal"
        overlayClassName="overlay"
      >
        <h2>Add Course or Instructor</h2>
        {selectedSlot && (
          <p>{selectedSlot.day} at {selectedSlot.hour}:00</p>
        )}
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search for a course or instructor"
        />
        <ul className="class-list">
          {filteredCourses.map(course => (
            <li key={course.id} onClick={() => handleCourseSelect(course)}>
              <strong>{course.courseTitle}</strong> - {course.instructor}
            </li>
          ))}
          {filteredCourses.length === 0 && searchQuery && <li>No courses or instructors found.</li>}
        </ul>
        <div className="modal-buttons">
          <button onClick={handleModalClose} className="cancel">Cancel</button>
        </div>
      </Modal>
    </div>
  );
};

export default ScheduleEvaluator;
