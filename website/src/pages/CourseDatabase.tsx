import { ChangeEvent, Component, FormEvent } from "react";
import BostonView from "../components/BostonView"; // Import BostonView component
import SearchBar from "../components/SearchBar"; // Import the new SearchBar component
import { supabase } from "../supabase/SupabaseClient";
import "./CourseDatabase.css";

interface TraceEval {
  course_title: string;
  instructor: string;
  professor_score: number;
}

interface CourseDatabaseState {
  courseName: string;
  traceEvals: TraceEval[];
  error: string | null;
}

class CourseDatabase extends Component<{}, CourseDatabaseState> {
  observer: IntersectionObserver;

  constructor(props: {}) {
    super(props);
    this.state = {
      courseName: "",
      traceEvals: [],
      error: null,
    };

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible"); // Add the 'visible' class
          } else {
            entry.target.classList.remove("visible"); // Remove the 'visible' class
          }
        });
      },
      {
        rootMargin: "20px 0px 20px 0px", // Adjust as needed to trigger slightly before full visibility
        threshold: 0, // Trigger as soon as any part is visible
      }
    );
  }

  fetchTraceEvals = async (course: string) => {
    try {
      const { data, error } = await supabase.rpc("combine_scores_by_course", {
        course_filter: course.trim(),
      });

      if (error) {
        this.setState({ error: error.message, traceEvals: [] });
      } else {
        const sortedResults = (data || []).sort(
          (a: TraceEval, b: TraceEval) => b.professor_score - a.professor_score
        );

        this.setState({ traceEvals: [], error: null }, () => {
          setTimeout(() => {
            this.setState({ traceEvals: sortedResults }, () => {
              this.observeBlocks();

              // Reset the scroll position to the top
              const courseBoxContent = document.querySelector(
                ".course-box-content"
              ) as HTMLElement;
              if (courseBoxContent) {
                courseBoxContent.scrollTop = 0;
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
    const { courseName } = this.state;
    if (courseName.trim()) {
      this.fetchTraceEvals(courseName);
    }
  };

  handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    this.setState({ courseName: event.target.value });
  };

  observeBlocks() {
    const blocks = document.querySelectorAll(".course-block");
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
    const { courseName, traceEvals, error } = this.state;

    const groupedByCourse = traceEvals.reduce((acc, evalData) => {
      const courseTitle = evalData.course_title || "Unknown Course";
      if (!acc[courseTitle]) {
        acc[courseTitle] = [];
      }
      acc[courseTitle].push(evalData);
      return acc;
    }, {} as Record<string, TraceEval[]>);

    return (
      <div className="course-database">
        <div className="overlay" />
        <div className="boston-view">
          <BostonView />
        </div>
        <div className="course-database-content">
          <SearchBar
            value={courseName}
            onInputChange={this.handleInputChange}
            onSearch={this.handleSearch}
          />

          {error && <p className="course-database-error">{error}</p>}

          <div className="course-box">
            <div className="course-box-content">
              {Object.entries(groupedByCourse).length === 0 && (
                <div className="course-no-results">
                  No results found.
                  <br />
                  <br />
                  Click the magnifying glass above to get started by searching
                  for a course.
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
                            className={this.getScoreClass(
                              professor.professor_score
                            )}
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
  }
}

export default CourseDatabase;
