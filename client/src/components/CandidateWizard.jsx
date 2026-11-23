import React, { useState, useEffect } from 'react';
import { candidateService } from '../services/candidateService';
import { storageService } from '../services/storageService';
import {
  User,
  GraduationCap,
  Briefcase,
  Code,
  FolderGit2,
  Award,
  Compass,
  FileText,
  CheckCircle,
  Plus,
  Trash2,
  Upload,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  AlertCircle
} from 'lucide-react';

export default function CandidateWizard({ initialUser, onUpdateProfile }) {
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState(initialUser || {});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  // Form states
  const [personal, setPersonal] = useState({
    name: '',
    phone: '',
    dob: '',
    gender: '',
    bio: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    linkedin: '',
    github: '',
    portfolio: '',
    leetcode: '',
    hackerrank: ''
  });

  const [educationList, setEducationList] = useState([]);
  const [newEdu, setNewEdu] = useState({
    degree: 'BE/BTech',
    institution: '',
    university: '',
    field_branch: 'Computer Engineering',
    start_year: 2022,
    end_year: 2026,
    score: 8.0,
    score_type: 'CGPA'
  });

  const [experienceList, setExperienceList] = useState([]);
  const [isFresher, setIsFresher] = useState(false);
  const [newExp, setNewExp] = useState({
    company: '',
    title: '',
    employment_type: 'Internship',
    start_date: '',
    end_date: '',
    currently_working: false,
    location: '',
    description: '',
    technologies: ''
  });

  const [skillsList, setSkillsList] = useState([]);
  const [newSkill, setNewSkill] = useState({
    skill_name: '',
    category: 'Programming',
    proficiency: 'Intermediate',
    experience_duration: '6 months'
  });

  const [projectsList, setProjectsList] = useState([]);
  const [newProj, setNewProj] = useState({
    title: '',
    description: '',
    technologies: '',
    role: 'Lead Developer',
    start_date: '',
    end_date: '',
    github_url: '',
    live_url: ''
  });

  const [certificationsList, setCertificationsList] = useState([]);
  const [newCert, setNewCert] = useState({
    name: '',
    issuer: '',
    issue_date: '',
    expiry_date: '',
    credential_url: ''
  });

  const [preferences, setPreferences] = useState({
    preferred_roles: 'Full Stack Developer, Software Developer',
    preferred_job_types: 'Full-time, Internship',
    workplace_preference: 'Hybrid',
    preferred_locations: 'Pune, Bengaluru, Remote',
    willing_to_relocate: 'Yes',
    expected_salary: '₹5–8 LPA',
    expected_stipend: '₹20k/month',
    preferred_industries: 'IT, SaaS, Cloud, AI'
  });

  const [resumeFile, setResumeFile] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);

  useEffect(() => {
    loadFullProfile();
  }, []);

  const loadFullProfile = async () => {
    try {
      setLoading(true);
      const data = await candidateService.getProfile();
      setProfile(data);

      setPersonal({
        name: data.name || '',
        phone: data.phone || '',
        dob: data.dob || '',
        gender: data.gender || '',
        bio: data.bio || '',
        address: data.address || '',
        city: data.city || '',
        state: data.state || '',
        pincode: data.pincode || '',
        linkedin: data.linkedin || '',
        github: data.github || '',
        portfolio: data.portfolio || '',
        leetcode: data.leetcode || '',
        hackerrank: data.hackerrank || ''
      });

      setEducationList(data.education || []);
      setExperienceList(data.experience || []);
      setSkillsList(data.skills || []);
      setProjectsList(data.projects || []);
      setCertificationsList(data.certifications || []);
      if (data.preferences && Object.keys(data.preferences).length > 0) {
        setPreferences({
          preferred_roles: data.preferences.preferred_roles || 'Full Stack Developer',
          preferred_job_types: data.preferences.preferred_job_types || 'Full-time, Internship',
          workplace_preference: data.preferences.workplace_preference || 'Hybrid',
          preferred_locations: data.preferences.preferred_locations || 'Pune, Remote',
          willing_to_relocate: data.preferences.willing_to_relocate || 'Yes',
          expected_salary: data.preferences.expected_salary || '',
          expected_stipend: data.preferences.expected_stipend || '',
          preferred_industries: data.preferences.preferred_industries || 'IT, SaaS'
        });
      }
    } catch (err) {
      console.warn('Could not load full profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const notifyUpdate = (updatedUser) => {
    setProfile(updatedUser);
    if (onUpdateProfile) onUpdateProfile(updatedUser);
  };

  // Step 1: Save Personal
  const handleSavePersonal = async () => {
    setSaving(true);
    try {
      const updated = await candidateService.updateProfile(personal);
      notifyUpdate(updated);
      setStep(2);
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  // Step 2: Add Education
  const handleAddEducation = async (e) => {
    e.preventDefault();
    if (!newEdu.institution || !newEdu.degree) return;
    try {
      const item = await candidateService.addEducation(newEdu);
      setEducationList([item, ...educationList]);
      setNewEdu({
        degree: 'BE/BTech',
        institution: '',
        university: '',
        field_branch: 'Computer Engineering',
        start_year: 2022,
        end_year: 2026,
        score: 8.0,
        score_type: 'CGPA'
      });
      const p = await candidateService.getProfile();
      notifyUpdate(p);
    } catch (err) {
      alert(err.message);
    }
  };

  // Step 3: Add Experience
  const handleAddExperience = async (e) => {
    e.preventDefault();
    if (!newExp.company || !newExp.title) return;
    try {
      const item = await candidateService.addExperience(newExp);
      setExperienceList([item, ...experienceList]);
      setNewExp({
        company: '',
        title: '',
        employment_type: 'Internship',
        start_date: '',
        end_date: '',
        currently_working: false,
        location: '',
        description: '',
        technologies: ''
      });
      const p = await candidateService.getProfile();
      notifyUpdate(p);
    } catch (err) {
      alert(err.message);
    }
  };

  // Step 4: Add Skill
  const handleAddSkill = async (e) => {
    e.preventDefault();
    if (!newSkill.skill_name) return;
    try {
      const item = await candidateService.addSkill(newSkill);
      setSkillsList([...skillsList, item]);
      setNewSkill({
        skill_name: '',
        category: 'Programming',
        proficiency: 'Intermediate',
        experience_duration: '6 months'
      });
      const p = await candidateService.getProfile();
      notifyUpdate(p);
    } catch (err) {
      alert(err.message);
    }
  };

  // Step 5: Add Project
  const handleAddProject = async (e) => {
    e.preventDefault();
    if (!newProj.title) return;
    try {
      const item = await candidateService.addProject(newProj);
      setProjectsList([...projectsList, item]);
      setNewProj({
        title: '',
        description: '',
        technologies: '',
        role: 'Lead Developer',
        start_date: '',
        end_date: '',
        github_url: '',
        live_url: ''
      });
      const p = await candidateService.getProfile();
      notifyUpdate(p);
    } catch (err) {
      alert(err.message);
    }
  };

  // Step 6: Add Certification
  const handleAddCert = async (e) => {
    e.preventDefault();
    if (!newCert.name || !newCert.issuer) return;
    try {
      const item = await candidateService.addCertification(newCert);
      setCertificationsList([...certificationsList, item]);
      setNewCert({
        name: '',
        issuer: '',
        issue_date: '',
        expiry_date: '',
        credential_url: ''
      });
      const p = await candidateService.getProfile();
      notifyUpdate(p);
    } catch (err) {
      alert(err.message);
    }
  };

  // Step 7: Save Preferences
  const handleSavePreferences = async () => {
    setSaving(true);
    try {
      await candidateService.updatePreferences(preferences);
      const p = await candidateService.getProfile();
      notifyUpdate(p);
      setStep(8);
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  // Step 8: Upload Resume & Photo
  const handleUploadResume = async () => {
    if (!resumeFile) return;
    setSaving(true);
    try {
      await candidateService.uploadResume(resumeFile);
      const p = await candidateService.getProfile();
      notifyUpdate(p);
      setResumeFile(null);
      alert('Resume uploaded successfully!');
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUploadPhoto = async () => {
    if (!photoFile) return;
    setSaving(true);
    try {
      await candidateService.uploadPhoto(photoFile);
      const p = await candidateService.getProfile();
      notifyUpdate(p);
      setPhotoFile(null);
      alert('Profile photo updated successfully!');
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const completionPct = profile.completionPercentage || 0;

  const stepsList = [
    { num: 1, label: 'Personal', icon: <User size={15} /> },
    { num: 2, label: 'Education', icon: <GraduationCap size={15} /> },
    { num: 3, label: 'Experience', icon: <Briefcase size={15} /> },
    { num: 4, label: 'Skills', icon: <Code size={15} /> },
    { num: 5, label: 'Projects', icon: <FolderGit2 size={15} /> },
    { num: 6, label: 'Certs', icon: <Award size={15} /> },
    { num: 7, label: 'Preferences', icon: <Compass size={15} /> },
    { num: 8, label: 'Resume', icon: <FileText size={15} /> },
    { num: 9, label: 'Review', icon: <CheckCircle size={15} /> }
  ];

  return (
    <div className="wizard-container">
      {/* Top Completion Header */}
      <div className="wizard-top-bar">
        <div>
          <span className="wizard-badge">
            <Sparkles size={14} /> CANDIDATE PROFILE SETUP
          </span>
          <h2>Candidate Professional Profile</h2>
          <p>
            Build your recruitment profile to receive transparent, verified recommendations from PlacioBridge Technologies.
          </p>
        </div>

        <div className="completion-card">
          <div className="completion-number">
            <b>{completionPct}%</b>
            <span>Profile Complete</span>
          </div>
          <div className="completion-bar-track">
            <div
              className="completion-bar-fill"
              style={{ width: `${completionPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Stepper Tabs */}
      <div className="wizard-stepper">
        {stepsList.map((s) => (
          <button
            key={s.num}
            className={`wizard-step-btn ${step === s.num ? 'active' : ''} ${step > s.num ? 'completed' : ''}`}
            onClick={() => setStep(s.num)}
          >
            <span className="step-circle">{s.num}</span>
            <span className="step-label">{s.label}</span>
          </button>
        ))}
      </div>

      {/* Wizard Step Body */}
      <div className="wizard-body-panel">
        {/* STEP 1: PERSONAL */}
        {step === 1 && (
          <div className="wizard-step-content">
            <h3>Step 1 — Personal &amp; Professional Links</h3>
            <p className="step-desc">
              Your contact details and professional profiles (GitHub, LinkedIn) for hiring teams.
            </p>

            <div className="formgrid">
              <div className="field-group">
                <label>Full Name *</label>
                <input
                  value={personal.name}
                  onChange={(e) => setPersonal({ ...personal, name: e.target.value })}
                  placeholder="Full Name"
                  required
                />
              </div>
              <div className="field-group">
                <label>Phone / WhatsApp *</label>
                <input
                  value={personal.phone}
                  onChange={(e) => setPersonal({ ...personal, phone: e.target.value })}
                  placeholder="+91 98765 43210"
                />
              </div>
              <div className="field-group">
                <label>Date of Birth</label>
                <input
                  type="date"
                  value={personal.dob}
                  onChange={(e) => setPersonal({ ...personal, dob: e.target.value })}
                />
              </div>
              <div className="field-group">
                <label>Gender (Optional)</label>
                <select
                  value={personal.gender}
                  onChange={(e) => setPersonal({ ...personal, gender: e.target.value })}
                >
                  <option value="">Select Gender</option>
                  <option>Male</option>
                  <option>Female</option>
                  <option>Non-binary</option>
                  <option>Prefer not to say</option>
                </select>
              </div>
              <div className="field-group">
                <label>Current City *</label>
                <input
                  value={personal.city}
                  onChange={(e) => setPersonal({ ...personal, city: e.target.value })}
                  placeholder="e.g. Pune"
                />
              </div>
              <div className="field-group">
                <label>State / Region</label>
                <input
                  value={personal.state}
                  onChange={(e) => setPersonal({ ...personal, state: e.target.value })}
                  placeholder="e.g. Maharashtra"
                />
              </div>
              <div className="field-group">
                <label>Pincode</label>
                <input
                  value={personal.pincode}
                  onChange={(e) => setPersonal({ ...personal, pincode: e.target.value })}
                  placeholder="411001"
                />
              </div>
              <div className="field-group">
                <label>LinkedIn Profile URL</label>
                <input
                  value={personal.linkedin}
                  onChange={(e) => setPersonal({ ...personal, linkedin: e.target.value })}
                  placeholder="https://linkedin.com/in/username"
                />
              </div>
              <div className="field-group">
                <label>GitHub Profile URL</label>
                <input
                  value={personal.github}
                  onChange={(e) => setPersonal({ ...personal, github: e.target.value })}
                  placeholder="https://github.com/username"
                />
              </div>
              <div className="field-group">
                <label>Portfolio / Personal Website</label>
                <input
                  value={personal.portfolio}
                  onChange={(e) => setPersonal({ ...personal, portfolio: e.target.value })}
                  placeholder="https://myportfolio.dev"
                />
              </div>
            </div>

            <div className="field-group" style={{ marginTop: 14 }}>
              <label>Short Bio / Professional Summary</label>
              <textarea
                rows={3}
                value={personal.bio}
                onChange={(e) => setPersonal({ ...personal, bio: e.target.value })}
                placeholder="Passionate computer engineering student specialized in React, Node, and Cloud DevOps..."
              />
            </div>

            <div className="wizard-actions">
              <button className="btn" disabled={saving} onClick={handleSavePersonal}>
                Save &amp; Continue <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: EDUCATION */}
        {step === 2 && (
          <div className="wizard-step-content">
            <h3>Step 2 — Educational Background</h3>
            <p className="step-desc">
              Essential for candidate eligibility verification. Jobs with mandatory degree requirements evaluate this section.
            </p>

            <form onSubmit={handleAddEducation} className="form-card-box">
              <h4>Add Qualification Record</h4>
              <div className="formgrid">
                <div className="field-group">
                  <label>Degree / Qualification *</label>
                  <select
                    value={newEdu.degree}
                    onChange={(e) => setNewEdu({ ...newEdu, degree: e.target.value })}
                  >
                    <option>BE/BTech</option>
                    <option>BCA</option>
                    <option>MCA</option>
                    <option>BSc CS/IT</option>
                    <option>MTech/ME</option>
                    <option>Diploma</option>
                    <option>12th Standard</option>
                    <option>10th Standard</option>
                  </select>
                </div>

                <div className="field-group">
                  <label>Branch / Field of Study *</label>
                  <input
                    placeholder="e.g. Computer Engineering, AI/DS, IT"
                    value={newEdu.field_branch}
                    onChange={(e) => setNewEdu({ ...newEdu, field_branch: e.target.value })}
                    required
                  />
                </div>

                <div className="field-group">
                  <label>Institution / College Name *</label>
                  <input
                    placeholder="e.g. Pune Institute of Computer Technology"
                    value={newEdu.institution}
                    onChange={(e) => setNewEdu({ ...newEdu, institution: e.target.value })}
                    required
                  />
                </div>

                <div className="field-group">
                  <label>University / Affiliation</label>
                  <input
                    placeholder="e.g. SPPU (Pune University)"
                    value={newEdu.university}
                    onChange={(e) => setNewEdu({ ...newEdu, university: e.target.value })}
                  />
                </div>

                <div className="field-group">
                  <label>Passing / Graduation Year *</label>
                  <input
                    type="number"
                    placeholder="2026"
                    value={newEdu.end_year}
                    onChange={(e) => setNewEdu({ ...newEdu, end_year: Number(e.target.value) })}
                    required
                  />
                </div>

                <div className="field-group">
                  <label>CGPA or Percentage *</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="8.2"
                    value={newEdu.score}
                    onChange={(e) => setNewEdu({ ...newEdu, score: Number(e.target.value) })}
                    required
                  />
                </div>
              </div>

              <button className="btn small" type="submit" style={{ marginTop: 12 }}>
                <Plus size={15} /> Add Education Record
              </button>
            </form>

            <div className="records-list">
              <h4>Saved Education History ({educationList.length})</h4>
              {educationList.length === 0 ? (
                <p className="muted">No education records added yet. Please add at least one graduation record.</p>
              ) : (
                educationList.map((edu) => (
                  <div className="record-item" key={edu.id}>
                    <div>
                      <b>{edu.degree} — {edu.field_branch}</b>
                      <span>{edu.institution} ({edu.university}) · Class of {edu.end_year}</span>
                      <small className="badge-tag">{edu.score} {edu.score_type}</small>
                    </div>
                    <button
                      className="icon-btn danger"
                      onClick={async () => {
                        await candidateService.deleteEducation(edu.id);
                        setEducationList(educationList.filter((x) => x.id !== edu.id));
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="wizard-actions">
              <button className="btn secondary" onClick={() => setStep(1)}>
                <ArrowLeft size={16} /> Back
              </button>
              <button className="btn" onClick={() => setStep(3)}>
                Save &amp; Continue <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: EXPERIENCE */}
        {step === 3 && (
          <div className="wizard-step-content">
            <h3>Step 3 — Professional Experience &amp; Internships</h3>
            <p className="step-desc">
              Freshers can skip or indicate "No professional experience". Any internships, freelance, or full-time roles can be recorded here.
            </p>

            <label className="checkbox-toggle">
              <input
                type="checkbox"
                checked={isFresher}
                onChange={(e) => setIsFresher(e.target.checked)}
              />
              <span>I am a fresher / No formal corporate experience yet</span>
            </label>

            {!isFresher && (
              <form onSubmit={handleAddExperience} className="form-card-box">
                <h4>Add Work Experience / Internship</h4>
                <div className="formgrid">
                  <div className="field-group">
                    <label>Company Name *</label>
                    <input
                      placeholder="e.g. PlacioBridge Technologies"
                      value={newExp.company}
                      onChange={(e) => setNewExp({ ...newExp, company: e.target.value })}
                      required
                    />
                  </div>
                  <div className="field-group">
                    <label>Role / Job Title *</label>
                    <input
                      placeholder="e.g. Full Stack Intern"
                      value={newExp.title}
                      onChange={(e) => setNewExp({ ...newExp, title: e.target.value })}
                      required
                    />
                  </div>
                  <div className="field-group">
                    <label>Employment Type</label>
                    <select
                      value={newExp.employment_type}
                      onChange={(e) => setNewExp({ ...newExp, employment_type: e.target.value })}
                    >
                      <option>Internship</option>
                      <option>Full Time</option>
                      <option>Part Time</option>
                      <option>Freelance</option>
                      <option>Contract</option>
                    </select>
                  </div>
                  <div className="field-group">
                    <label>Technologies Used</label>
                    <input
                      placeholder="e.g. React, Node.js, Docker, AWS"
                      value={newExp.technologies}
                      onChange={(e) => setNewExp({ ...newExp, technologies: e.target.value })}
                    />
                  </div>
                </div>
                <div className="field-group" style={{ marginTop: 10 }}>
                  <label>Role Description &amp; Achievements</label>
                  <textarea
                    rows={2}
                    placeholder="Built API microservices and optimized UI components..."
                    value={newExp.description}
                    onChange={(e) => setNewExp({ ...newExp, description: e.target.value })}
                  />
                </div>
                <button className="btn small" type="submit" style={{ marginTop: 12 }}>
                  <Plus size={15} /> Add Experience
                </button>
              </form>
            )}

            <div className="records-list">
              <h4>Recorded Experience ({experienceList.length})</h4>
              {experienceList.length === 0 ? (
                <p className="muted">
                  {isFresher ? 'Marked as Fresher. Recommendation engine will prioritize entry-level & internship drives.' : 'No experience records added.'}
                </p>
              ) : (
                experienceList.map((exp) => (
                  <div className="record-item" key={exp.id}>
                    <div>
                      <b>{exp.title} at {exp.company}</b>
                      <span>{exp.employment_type} · {exp.technologies}</span>
                    </div>
                    <button
                      className="icon-btn danger"
                      onClick={async () => {
                        await candidateService.deleteExperience(exp.id);
                        setExperienceList(experienceList.filter((x) => x.id !== exp.id));
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="wizard-actions">
              <button className="btn secondary" onClick={() => setStep(2)}>
                <ArrowLeft size={16} /> Back
              </button>
              <button className="btn" onClick={() => setStep(4)}>
                Save &amp; Continue <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: STRUCTURED SKILLS */}
        {step === 4 && (
          <div className="wizard-step-content">
            <h3>Step 4 — Structured Technical &amp; Soft Skills</h3>
            <p className="step-desc">
              Skills are individually categorized and directly power the recommendation match score (25% weight).
            </p>

            <form onSubmit={handleAddSkill} className="form-card-box">
              <h4>Add Individual Skill</h4>
              <div className="formgrid">
                <div className="field-group">
                  <label>Skill Name *</label>
                  <input
                    placeholder="e.g. React, Docker, Python, AWS"
                    value={newSkill.skill_name}
                    onChange={(e) => setNewSkill({ ...newSkill, skill_name: e.target.value })}
                    required
                  />
                </div>

                <div className="field-group">
                  <label>Category *</label>
                  <select
                    value={newSkill.category}
                    onChange={(e) => setNewSkill({ ...newSkill, category: e.target.value })}
                  >
                    <option>Programming</option>
                    <option>Frontend</option>
                    <option>Backend</option>
                    <option>Database</option>
                    <option>Cloud</option>
                    <option>DevOps</option>
                    <option>Security</option>
                    <option>Data</option>
                    <option>AI/ML</option>
                    <option>Testing</option>
                    <option>Design</option>
                    <option>Tools</option>
                    <option>Soft Skills</option>
                  </select>
                </div>

                <div className="field-group">
                  <label>Proficiency *</label>
                  <select
                    value={newSkill.proficiency}
                    onChange={(e) => setNewSkill({ ...newSkill, proficiency: e.target.value })}
                  >
                    <option>Beginner</option>
                    <option>Intermediate</option>
                    <option>Advanced</option>
                    <option>Expert</option>
                  </select>
                </div>

                <div className="field-group">
                  <label>Experience Duration</label>
                  <input
                    placeholder="e.g. 8 months, 1 year"
                    value={newSkill.experience_duration}
                    onChange={(e) => setNewSkill({ ...newSkill, experience_duration: e.target.value })}
                  />
                </div>
              </div>

              <button className="btn small" type="submit" style={{ marginTop: 12 }}>
                <Plus size={15} /> Add Skill
              </button>
            </form>

            <div className="skills-tags-wrap">
              <h4>Added Skills ({skillsList.length})</h4>
              {skillsList.length === 0 ? (
                <p className="muted">Add at least 3 skills to maximize your job match score.</p>
              ) : (
                <div className="skills-badge-grid">
                  {skillsList.map((sk) => (
                    <div className="skill-chip-box" key={sk.id}>
                      <div>
                        <b>{sk.skill_name}</b>
                        <small>{sk.category} · {sk.proficiency}</small>
                      </div>
                      <button
                        className="chip-remove"
                        onClick={async () => {
                          await candidateService.deleteSkill(sk.id);
                          setSkillsList(skillsList.filter((x) => x.id !== sk.id));
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="wizard-actions">
              <button className="btn secondary" onClick={() => setStep(3)}>
                <ArrowLeft size={16} /> Back
              </button>
              <button className="btn" onClick={() => setStep(5)}>
                Save &amp; Continue <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: PROJECTS */}
        {step === 5 && (
          <div className="wizard-step-content">
            <h3>Step 5 — Projects &amp; Portfolio Works</h3>
            <p className="step-desc">
              Highlight real systems you engineered. Projects boost recruiter confidence and experience verification.
            </p>

            <form onSubmit={handleAddProject} className="form-card-box">
              <h4>Add Technical Project</h4>
              <div className="formgrid">
                <div className="field-group">
                  <label>Project Title *</label>
                  <input
                    placeholder="e.g. AI-Powered Smart Campus Platform"
                    value={newProj.title}
                    onChange={(e) => setNewProj({ ...newProj, title: e.target.value })}
                    required
                  />
                </div>
                <div className="field-group">
                  <label>Role</label>
                  <input
                    placeholder="e.g. Full Stack Developer"
                    value={newProj.role}
                    onChange={(e) => setNewProj({ ...newProj, role: e.target.value })}
                  />
                </div>
                <div className="field-group">
                  <label>Technologies Used</label>
                  <input
                    placeholder="e.g. React, Node.js, SQLite, Docker"
                    value={newProj.technologies}
                    onChange={(e) => setNewProj({ ...newProj, technologies: e.target.value })}
                  />
                </div>
                <div className="field-group">
                  <label>GitHub Repository URL</label>
                  <input
                    placeholder="https://github.com/user/project"
                    value={newProj.github_url}
                    onChange={(e) => setNewProj({ ...newProj, github_url: e.target.value })}
                  />
                </div>
              </div>
              <div className="field-group" style={{ marginTop: 10 }}>
                <label>Project Description</label>
                <textarea
                  rows={2}
                  placeholder="Architected a responsive dashboard with real-time updates and proctored testing..."
                  value={newProj.description}
                  onChange={(e) => setNewProj({ ...newProj, description: e.target.value })}
                />
              </div>
              <button className="btn small" type="submit" style={{ marginTop: 12 }}>
                <Plus size={15} /> Add Project
              </button>
            </form>

            <div className="records-list">
              <h4>Your Projects ({projectsList.length})</h4>
              {projectsList.map((pr) => (
                <div className="record-item" key={pr.id}>
                  <div>
                    <b>{pr.title}</b>
                    <span>{pr.technologies} · {pr.role}</span>
                  </div>
                  <button
                    className="icon-btn danger"
                    onClick={async () => {
                      await candidateService.deleteProject(pr.id);
                      setProjectsList(projectsList.filter((x) => x.id !== pr.id));
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>

            <div className="wizard-actions">
              <button className="btn secondary" onClick={() => setStep(4)}>
                <ArrowLeft size={16} /> Back
              </button>
              <button className="btn" onClick={() => setStep(6)}>
                Save &amp; Continue <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 6: CERTIFICATIONS */}
        {step === 6 && (
          <div className="wizard-step-content">
            <h3>Step 6 — Industry Certifications</h3>
            <p className="step-desc">
              Certifications from AWS, Microsoft, Google Cloud, Oracle, or Coursera/Udemy.
            </p>

            <form onSubmit={handleAddCert} className="form-card-box">
              <h4>Add Certification</h4>
              <div className="formgrid">
                <div className="field-group">
                  <label>Certification Name *</label>
                  <input
                    placeholder="e.g. AWS Certified Solutions Architect Associate"
                    value={newCert.name}
                    onChange={(e) => setNewCert({ ...newCert, name: e.target.value })}
                    required
                  />
                </div>
                <div className="field-group">
                  <label>Issuing Organization *</label>
                  <input
                    placeholder="e.g. Amazon Web Services (AWS)"
                    value={newCert.issuer}
                    onChange={(e) => setNewCert({ ...newCert, issuer: e.target.value })}
                    required
                  />
                </div>
                <div className="field-group">
                  <label>Credential Verification URL</label>
                  <input
                    placeholder="https://credly.com/badges/..."
                    value={newCert.credential_url}
                    onChange={(e) => setNewCert({ ...newCert, credential_url: e.target.value })}
                  />
                </div>
              </div>
              <button className="btn small" type="submit" style={{ marginTop: 12 }}>
                <Plus size={15} /> Add Certification
              </button>
            </form>

            <div className="records-list">
              <h4>Recorded Certifications ({certificationsList.length})</h4>
              {certificationsList.map((c) => (
                <div className="record-item" key={c.id}>
                  <div>
                    <b>{c.name}</b>
                    <span>{c.issuer}</span>
                  </div>
                  <button
                    className="icon-btn danger"
                    onClick={async () => {
                      await candidateService.deleteCertification(c.id);
                      setCertificationsList(certificationsList.filter((x) => x.id !== c.id));
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>

            <div className="wizard-actions">
              <button className="btn secondary" onClick={() => setStep(5)}>
                <ArrowLeft size={16} /> Back
              </button>
              <button className="btn" onClick={() => setStep(7)}>
                Save &amp; Continue <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 7: CAREER PREFERENCES */}
        {step === 7 && (
          <div className="wizard-step-content">
            <h3>Step 7 — Career Preferences</h3>
            <p className="step-desc">
              Crucial for personalized recommendations. Select your target roles, job types, and work models.
            </p>

            <div className="formgrid">
              <div className="field-group">
                <label>Target Job Roles (Comma-separated)</label>
                <input
                  value={preferences.preferred_roles}
                  onChange={(e) => setPreferences({ ...preferences, preferred_roles: e.target.value })}
                  placeholder="DevOps Engineer, Cloud Engineer, Software Developer"
                />
              </div>

              <div className="field-group">
                <label>Preferred Employment Types</label>
                <input
                  value={preferences.preferred_job_types}
                  onChange={(e) => setPreferences({ ...preferences, preferred_job_types: e.target.value })}
                  placeholder="Full-time, Internship"
                />
              </div>

              <div className="field-group">
                <label>Workplace Preference</label>
                <select
                  value={preferences.workplace_preference}
                  onChange={(e) => setPreferences({ ...preferences, workplace_preference: e.target.value })}
                >
                  <option>Remote</option>
                  <option>Hybrid</option>
                  <option>On-site</option>
                </select>
              </div>

              <div className="field-group">
                <label>Preferred Locations</label>
                <input
                  value={preferences.preferred_locations}
                  onChange={(e) => setPreferences({ ...preferences, preferred_locations: e.target.value })}
                  placeholder="Pune, Bengaluru, Mumbai, Remote"
                />
              </div>

              <div className="field-group">
                <label>Willing to Relocate?</label>
                <select
                  value={preferences.willing_to_relocate}
                  onChange={(e) => setPreferences({ ...preferences, willing_to_relocate: e.target.value })}
                >
                  <option>Yes</option>
                  <option>No</option>
                  <option>Maybe</option>
                </select>
              </div>

              <div className="field-group">
                <label>Expected CTC (Full-time)</label>
                <input
                  value={preferences.expected_salary}
                  onChange={(e) => setPreferences({ ...preferences, expected_salary: e.target.value })}
                  placeholder="e.g. ₹5–8 LPA"
                />
              </div>

              <div className="field-group">
                <label>Expected Internship Stipend</label>
                <input
                  value={preferences.expected_stipend}
                  onChange={(e) => setPreferences({ ...preferences, expected_stipend: e.target.value })}
                  placeholder="e.g. ₹20,000/month"
                />
              </div>

              <div className="field-group">
                <label>Preferred Industries</label>
                <input
                  value={preferences.preferred_industries}
                  onChange={(e) => setPreferences({ ...preferences, preferred_industries: e.target.value })}
                  placeholder="IT, SaaS, AI, FinTech"
                />
              </div>
            </div>

            <div className="wizard-actions">
              <button className="btn secondary" onClick={() => setStep(6)}>
                <ArrowLeft size={16} /> Back
              </button>
              <button className="btn" disabled={saving} onClick={handleSavePreferences}>
                Save &amp; Continue <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 8: RESUME & PHOTO */}
        {step === 8 && (
          <div className="wizard-step-content">
            <h3>Step 8 — Resume &amp; Profile Photo</h3>
            <p className="step-desc">
              Your resume is stored securely and attached to job applications. Allowed formats: PDF, DOC, DOCX.
            </p>

            <div className="upload-sections-grid">
              <div className="upload-box-card">
                <h4><FileText size={18} /> Candidate Resume</h4>
                <p>Upload your latest professional resume (Max 10MB)</p>
                {profile.resume ? (
                  <div className="file-active-badge">
                    <CheckCircle color="#16a34a" size={16} /> Current Resume: <b>{profile.resume}</b>
                    <a href={`/uploads/${profile.resume}`} target="_blank" rel="noreferrer" className="view-link">
                      View File
                    </a>
                  </div>
                ) : (
                  <div className="file-missing-badge">
                    <AlertCircle color="#d97706" size={16} /> No resume uploaded yet.
                  </div>
                )}
                <div className="upload-input-wrap">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => setResumeFile(e.target.files[0])}
                  />
                  <button className="btn small" disabled={!resumeFile || saving} onClick={handleUploadResume}>
                    <Upload size={14} /> Upload Resume
                  </button>
                </div>
              </div>

              <div className="upload-box-card">
                <h4><User size={18} /> Profile Photo</h4>
                <p>Upload a clean, professional headshot (JPG, PNG, WebP)</p>
                {profile.profile_photo ? (
                  <div className="photo-preview-wrap">
                    <img
                      src={`/uploads/${profile.profile_photo}`}
                      alt="Profile"
                      className="preview-avatar"
                    />
                    <span>Active Profile Photo</span>
                  </div>
                ) : null}
                <div className="upload-input-wrap">
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp"
                    onChange={(e) => setPhotoFile(e.target.files[0])}
                  />
                  <button className="btn small" disabled={!photoFile || saving} onClick={handleUploadPhoto}>
                    <Upload size={14} /> Upload Photo
                  </button>
                </div>
              </div>
            </div>

            <div className="wizard-actions">
              <button className="btn secondary" onClick={() => setStep(7)}>
                <ArrowLeft size={16} /> Back
              </button>
              <button className="btn" onClick={() => setStep(9)}>
                Review Profile <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 9: REVIEW */}
        {step === 9 && (
          <div className="wizard-step-content review-step">
            <div className="review-banner">
              <CheckCircle size={32} color="#16a34a" />
              <div>
                <h3>Profile Verification &amp; Review</h3>
                <p>
                  Your profile completion is <b>{completionPct}%</b>. Your profile is ready for personalized job recommendations.
                </p>
              </div>
            </div>

            <div className="review-summary-grid">
              <div className="summary-block">
                <b>Personal Details</b>
                <p>{profile.name} · {profile.email} · {profile.phone || 'Phone not set'}</p>
                <p>{profile.city}, {profile.state}</p>
              </div>

              <div className="summary-block">
                <b>Graduation &amp; Education</b>
                {educationList.length > 0 ? (
                  educationList.map((e) => (
                    <p key={e.id}>{e.degree} in {e.field_branch} ({e.score} {e.score_type})</p>
                  ))
                ) : (
                  <p className="muted">No education record.</p>
                )}
              </div>

              <div className="summary-block">
                <b>Top Skills ({skillsList.length})</b>
                <p>{skillsList.map((s) => s.skill_name).slice(0, 6).join(', ') || 'No skills added'}</p>
              </div>

              <div className="summary-block">
                <b>Career Target</b>
                <p>{preferences.preferred_roles || 'Software Developer'}</p>
                <p>{preferences.workplace_preference} · {preferences.preferred_locations}</p>
              </div>
            </div>

            <div className="wizard-actions">
              <button className="btn secondary" onClick={() => setStep(8)}>
                <ArrowLeft size={16} /> Edit Details
              </button>
              <a className="btn" href="#/dashboard">
                Explore Recommendations <Sparkles size={16} />
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
