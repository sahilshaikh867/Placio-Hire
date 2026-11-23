import React, { useEffect, useState } from 'react';
import { teamService } from '../services/teamService';
import { Users, ExternalLink, ShieldCheck } from 'lucide-react';

export default function CoreTeam() {
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    teamService.getTeamMembers()
      .then((data) => {
        if (mounted) setTeam(data);
      })
      .catch((err) => {
        console.warn('Failed to load team data:', err);
        if (mounted) setTeam(teamService.getFallbackTeam());
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, []);

  return (
    <section className="core-team-section" id="team">
      <div className="section-head">
        <div className="eyebrow">
          <Users size={14} /> LEADERSHIP &amp; ENGINEERING
        </div>
        <h2>Meet Our Core Team</h2>
        <p>
          The architects and industry mentors behind <strong>PlacioBridge Technologies LLP</strong> and Hire-Placio.
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '30px', color: 'var(--muted)' }}>
          Loading team information...
        </div>
      ) : (
        <div className="team-grid">
          {team.map((member) => (
            <div className="team-card" key={member.id || member.name}>
              <div className="team-photo-wrap">
                <img
                  src={member.photo || 'https://www.placiobridge.com/_next/static/immutable/media/sahil%20shaikh.1tb-t_a1arqk7.jpg'}
                  alt={member.name}
                  className="team-photo"

                />
                <div className="team-badge">
                  <ShieldCheck size={14} /> Verified Leader
                </div>
              </div>
              <div className="team-info">
                <h3>{member.name}</h3>
                <span className="team-role">{member.designation}</span>
                <p className="team-bio">{member.bio}</p>
                {member.linkedin && (
                  <a
                    href={member.linkedin}
                    target="_blank"
                    rel="noreferrer"
                    className="team-link"
                  >
                    View Profile <ExternalLink size={13} />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
