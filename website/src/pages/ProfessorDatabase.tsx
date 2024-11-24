// src/components/ProfessorDatabase.tsx

import { ChangeEvent, Component, FormEvent } from "react";
import BostonView from "../components/BostonView"; // Adjust the import path if necessary
import SearchBar from "../components/SearchBar"; // Import the new SearchBar component
import { supabase } from "../supabase/SupabaseClient";
import "./ProfessorDatabase.css";

interface TraceEval {
  instructor: string;
  course_title: string;
  professor_score: number;
}

interface ProfessorDatabaseState {
  professorName: string;
  traceEvals: TraceEval[];
  error: string | null;
}

class ProfessorDatabase extends Component<{}, ProfessorDatabaseState> {
  observer: IntersectionObserver;

  constructor(props: {}) {
    super(props);
    this.state = {
      professorName: "",
      traceEvals: [],
      error: null,
    };

    this.observer = new IntersectionObserver(
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
        rootMargin: "20px 0px 20px 0px", // Adjust to trigger fade-in slightly earlier
        threshold: 0, // Trigger as soon as any part is visible
      }
    );
  }

  fetchTraceEvals = async (name: string) => {
    try {
      const { data, error } = await supabase.rpc(
        "combine_scores_by_professor",
        {
          name_filter: name.trim(),
        }
      );

      if (error) {
        this.setState({ error: error.message, traceEvals: [] });
      } else {
        const combinedResults = (data || []).map((result: any) => ({
          instructor: result.instructor,
          course_title: result.course_title,
          professor_score: result.professor_score,
        }));

        // Add fadeIn state to trigger fade-in effect for new results
        this.setState({ traceEvals: [], error: null }, () => {
          setTimeout(() => {
            this.setState({ traceEvals: combinedResults }, () => {
              this.observeBlocks();

              // Reset the scroll position to the top
              const professorBoxContent = document.querySelector(
                ".professor-box-content"
              ) as HTMLElement;
              if (professorBoxContent) {
                professorBoxContent.scrollTop = 0;
              }
            });
          }, 100); // Short delay to allow DOM reset
        });
      }
    } catch (err: any) {
      this.setState({ error: err.message, traceEvals: [] });
    }
  };

  handleSearch = (event: FormEvent) => {
    event.preventDefault();
    const { professorName } = this.state;
    if (professorName.trim()) {
      this.fetchTraceEvals(professorName);
    }
  };

  handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    this.setState({ professorName: event.target.value });
  };

  observeBlocks() {
    const blocks = document.querySelectorAll(".professor-block");
    blocks.forEach((block) => {
      if (block.classList.contains("visible")) {
        return;
      }
      this.observer.observe(block);
    });
  }

  componentDidMount() {
    this.observeBlocks();
  }

  getScoreClass(score: number): string {
    if (score < -5) return "red";
    if (score >= -5 && score < 5) return "yellow";
    return "green";
  }

  render() {
    const { professorName, traceEvals, error } = this.state;

    return (
      <div className="professor-database">
        <div className="overlay" />
        <div className="boston-view">
          <BostonView />
        </div>
        <div className="professor-database-content">
          <SearchBar
            value={professorName}
            onInputChange={this.handleInputChange}
            onSearch={this.handleSearch}
          />

          {error && <p className="professor-database-error">{error}</p>}

          <div className="professor-box">
            <div className="professor-box-content">
              {traceEvals.length === 0 && (
                <div className="professor-no-results">
                  No results.
                  <br />
                  <br />
                  Click the magnifying glass above to get started by searching
                  for a professor.
                </div>
              )}
              {traceEvals.map((evalData, index) => (
                <div
                  key={index}
                  className={`professor-block ${this.getScoreClass(
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
  }
}

export default ProfessorDatabase;
