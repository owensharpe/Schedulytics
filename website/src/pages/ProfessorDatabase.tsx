import { useEffect, useState } from "react";
import BostonView from "../components/BostonView";
import SearchBar from "../components/SearchBar";
import { useFadeIn } from "../hooks/useFadeIn";
import { supabase } from "../supabase/SupabaseClient";
import "./ProfessorDatabase.css";

interface TraceEval {
  instructor: string;
  course_title: string;
  professor_score: number;
}

const ProfessorDatabase: React.FC = () => {
  const [professorName, setProfessorName] = useState<string>("");
  const [traceEvals, setTraceEvals] = useState<TraceEval[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fadeIn = useFadeIn(50);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
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

    const blocks = document.querySelectorAll(".professor-block");
    blocks.forEach((block) => observer.observe(block));

    return () => observer.disconnect();
  }, [traceEvals]);

  const fetchTraceEvals = async (name: string) => {
    try {
      const { data, error } = await supabase.rpc(
        "combine_scores_by_professor",
        {
          name_filter: name.trim(),
        }
      );

      if (error) {
        setError(error.message);
        setTraceEvals([]);
      } else {
        const combinedResults = (data || []).map((result: any) => ({
          instructor: result.instructor,
          course_title: result.course_title,
          professor_score: result.professor_score,
        }));

        setTraceEvals(combinedResults);
        setError(null);

        const professorBoxContent = document.querySelector(
          ".professor-box-content"
        ) as HTMLElement;

        if (professorBoxContent) {
          professorBoxContent.scrollTop = 0;
        }
      }
    } catch (err: any) {
      setError(err.message);
      setTraceEvals([]);
    }
  };

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();

    if (professorName.trim()) {
      fetchTraceEvals(professorName);
    }
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setProfessorName(event.target.value);
  };

  const getScoreClass = (score: number): string => {
    if (score < -5) return "red";
    if (score >= -5 && score < 5) return "yellow";

    return "green";
  };

  return (
    <div className={`professor-database fade-in ${fadeIn ? "show" : ""}`}>
      <div className="overlay" />
      <div className="boston-view">
        <BostonView />
      </div>
      <div className="professor-database-content">
        <SearchBar
          value={professorName}
          onInputChange={handleInputChange}
          onSearch={handleSearch}
        />

        {error && <p className="professor-database-error">{error}</p>}

        <div className="professor-box">
          <div className="professor-box-content">
            {traceEvals.length === 0 && (
              <div className="professor-no-results">
                No results.
                <br />
                <br />
                Click the magnifying glass above to get started by searching for
                a professor.
              </div>
            )}
            {traceEvals.map((evalData, index) => (
              <div
                key={index}
                className={`professor-block ${getScoreClass(
                  evalData.professor_score
                )}`}
              >
                <span>
                  <em>{evalData.instructor}</em>
                </span>
                <span>{evalData.course_title}</span>
                <span>
                  <em>{evalData.professor_score.toFixed(1)}</em>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfessorDatabase;
