import { useState, useEffect } from 'react';
import { useInView } from 'react-intersection-observer';
import { getTeamMembers } from '../services/api';
import './Team.css';

function getInitials(name) {
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function Team() {
  const [members, setMembers] = useState([]);
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });

  useEffect(() => {
    getTeamMembers().then(setMembers);
  }, []);

  return (
    <section className="section" id="equipo" ref={ref}>
      <div className="container">
        <h2 className="section-title">Nuestro Equipo</h2>
        <p className="section-subtitle">
          Las personas detrás de cada empanada que llega a tu mesa
        </p>

        <div className="team-grid">
          {members.map((member, index) => (
            <div
              key={member.id}
              className="neu-card team-card"
              style={{
                opacity: inView ? 1 : 0,
                transform: inView ? 'translateY(0)' : 'translateY(30px)',
                transition: `all 0.6s ease ${index * 0.15}s`,
              }}
            >
              <div className="team-avatar">
                {member.avatarUrl ? (
                  <img src={member.avatarUrl} alt={member.name} />
                ) : (
                  <div className={`team-avatar-placeholder team-avatar-${index + 1}`}>
                    {getInitials(member.name)}
                  </div>
                )}
              </div>
              <h3 className="team-name">{member.name}</h3>
              <p className="team-role">{member.role}</p>
              <p className="team-bio">{member.bio}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
