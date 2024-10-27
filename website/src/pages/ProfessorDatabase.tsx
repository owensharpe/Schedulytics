// ProfessorDatabase.tsx

import React, { useState, useEffect, useMemo } from 'react';
import Papa from 'papaparse';
import Fuse from 'fuse.js';
import './ProfessorDatabase.css';

interface ProfessorData {
  firstName: string;
  lastName: string;
  fullName: string;
  id: string;
  department: string;
  institutionName: string;
  institutionID: string;
  numberOfRatings: string;
  averageRating: string;
  wouldTakeAgain: number; // Changed to number
  levelOfDifficulty: string;
  popularTags: string[];
}

const ProfessorDatabase: React.FC = () => {
  const [professorData, setProfessorData] = useState<ProfessorData[]>([]);
  const [query, setQuery] = useState('');
  const [filteredProfessors, setFilteredProfessors] = useState<ProfessorData[]>([]);

  const parsePopularTags = (tagsString: string): string[] => {
    if (!tagsString) return [];
    try {
      const validJsonString = tagsString.replace(/'/g, '"');
      return JSON.parse(validJsonString);
    } catch (error) {
      console.error('Error parsing Popular Tags:', error);
      return [];
    }
  };

  useEffect(() => {
    Papa.parse('/neu_rmp.csv', {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data: ProfessorData[] = results.data.map((row: any) => {
          // Parse 'Would Take Again (Percent)'
          let wouldTakeAgainValue = parseFloat(row['Would Take Again (Percent)']);
          if (Number.isNaN(wouldTakeAgainValue)) {
            wouldTakeAgainValue = 0;
          } else {
            wouldTakeAgainValue *= 100; // Convert decimal to percentage
          }

          return {
            firstName: row['First Name'] || '',
            lastName: row['Last Name'] || '',
            fullName: `${row['First Name'] || ''} ${row['Last Name'] || ''}`.trim(),
            id: row['ID'] || '',
            department: row['Department'] || '',
            institutionName: row['Institution Name'] || '',
            institutionID: row['Institution ID'] || '',
            numberOfRatings: row['Number of Ratings'] || '0',
            averageRating: row['Average Rating (Out of 5)'] || '0',
            wouldTakeAgain: wouldTakeAgainValue, // Assign as number
            levelOfDifficulty: row['Level of Difficulty (Out of 5)'] || '0',
            popularTags: parsePopularTags(row['Popular Tags']),
          };
        });

        console.log('Loaded Professor Data:', data);
        setProfessorData(data);
      },
      error: (error) => {
        console.error('Error parsing CSV:', error);
      },
    });
  }, []);

  const fuse = useMemo(
    () =>
      new Fuse(professorData, {
        keys: ['fullName', 'department'],
        includeScore: true,
        threshold: 0.4,
      }),
    [professorData]
  );

  useEffect(() => {
    console.log('Search Query:', query);
    console.log('Professor Data Available for Search:', professorData);

    if (query.trim() === '') {
      setFilteredProfessors([]);
    } else {
      const results = fuse.search(query).map((result) => result.item);
      console.log('Search Results:', results);
      setFilteredProfessors(results);
    }
  }, [query, fuse]);

  return (
    <div className="professor-database">
      <h2>Search for Professors by Name or Department</h2>
      <input
        type="text"
        placeholder="Type a professor's name or department..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {filteredProfessors.length > 0 ? (
        <ul>
          {filteredProfessors.map((prof) => (
            <li key={prof.id}>
              <div>
                <strong>{prof.fullName}</strong>
                <p>ID: {prof.id}</p>
                <p>Department: {prof.department}</p>
                <p>Institution: {prof.institutionName}</p>
                <p>Number of Ratings: {prof.numberOfRatings}</p>
                <p>Average Rating: {prof.averageRating}</p>
                <p>Would Take Again: {Math.round(prof.wouldTakeAgain)}%</p> {/* Updated */}
                <p>Level of Difficulty: {prof.levelOfDifficulty}/5</p>
                <p>
                  Key Words:{' '}
                  {prof.popularTags.length > 0 ? prof.popularTags.join(', ') : 'N/A'}
                </p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        query ? (
          <div className="no-results">No professors found</div>
        ) : (
          <p>Click above to search for a teacher</p>
        )
      )}
    </div>
  );
};

export default ProfessorDatabase;
