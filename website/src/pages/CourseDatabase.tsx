import React, { useEffect, useState } from "react";
import BostonView from "../components/BostonView"; // Import BostonView component
import SearchBar from "../components/SearchBar"; // Import the new SearchBar
import { useFadeIn } from "../hooks/useFadeIn";
import { supabase } from "../supabase/SupabaseClient";
import "./CourseDatabase.css";

interface TraceEval {
  course_title: string;
  instructor: string;
  professor_score: number;
}

const CourseDatabase: React.FC = () => {
  const [courseName, setCourseName] = useState<string>("");
  const [traceEvals, setTraceEvals] = useState<TraceEval[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fadeIn = useFadeIn(50); // Trigger the fade-in effect

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible"); // Add the visible class for fade-in
          } else {
            entry.target.classList.remove("visible");
          }
        });
      },
      {
        rootMargin: "20px 0px 20px 0px",
        threshold: 0,
      }
    );

    const blocks = document.querySelectorAll(".course-block");
    blocks.forEach((block) => observer.observe(block));

    return () => observer.disconnect(); // Clean up the observer on component unmount
  }, [traceEvals]); // Re-run when traceEvals changes

  const fetchTraceEvals = async (course: string) => {
    try {
      const { data, error } = await supabase.rpc("combine_scores_by_course", {
        course_filter: course.trim(),
      });

      if (error) {
        setError(error.message);
        setTraceEvals([]);
      } else {
        const sortedResults = (data || []).sort(
          (a: TraceEval, b: TraceEval) => b.professor_score - a.professor_score
        );
        setTraceEvals(sortedResults);
        setError(null);
      }
    } catch (err: any) {
      setError(err.message);
      setTraceEvals([]);
    }
  };

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    if (courseName.trim()) {
      fetchTraceEvals(courseName);
    }
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setCourseName(event.target.value);
  };

  const getScoreClass = (score: number): string => {
    if (score < -5) return "red";
    if (score >= -5 && score < 5) return "yellow";
    return "green";
  };

  const groupedByCourse = traceEvals.reduce((acc, evalData) => {
    const courseTitle = evalData.course_title || "Unknown Course";
    if (!acc[courseTitle]) {
      acc[courseTitle] = [];
    }
    acc[courseTitle].push(evalData);
    return acc;
  }, {} as Record<string, TraceEval[]>);

  return (
    <div className={`course-database fade-in ${fadeIn ? "show" : ""}`}>
      <div className="overlay" />
      <div className="boston-view">
        <BostonView />
      </div>
      <div className="course-database-content">
        <SearchBar
          value={courseName}
          onInputChange={handleInputChange}
          onSearch={handleSearch}
        />

        {error && <p className="course-database-error">{error}</p>}

        <div className="course-box">
          <div className="course-box-content">
            {Object.entries(groupedByCourse).length === 0 && (
              <div className="course-no-results">
                No results found.
                <br />
                <br />
                Click the magnifying glass above to get started by searching for
                a course.
              </div>
            )}
            {Object.entries(groupedByCourse).map(
              ([courseTitle, professors], index) => (
                <div key={index} className="course-block">
                  <span>
                    <em>{courseTitle}</em>
                  </span>
                  <ul>
                    {professors.map((professor, idx) => (
                      <li key={idx}>
                        {professor.instructor}
                        <span
                          className={`professor-score ${getScoreClass(
                            professor.professor_score
                          )}`}
                        >
                          {professor.professor_score.toFixed(1)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseDatabase;
