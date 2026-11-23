/**
 * TechHire / Hire-Placio Rules-Based Job Matching Engine
 * Fully transparent, non-black-box calculation
 * 
 * Weights (Total: 100%):
 * - Education eligibility:   30%
 * - Skills:                  25%
 * - Desired role:            15%
 * - Experience:              10%
 * - Location:                 5%
 * - Job type:                 5%
 * - Industry:                 5%
 * - Salary/stipend:           5%
 */

export function calculateJobMatch({ job, educationReqs = [], requiredSkills = [], candidate = {} }) {
  const reasons = [];
  let totalScore = 0;

  // 1. EDUCATION EVALUATION (30%)
  let eduScore = 0;
  let eduEligible = true;
  let mandatoryFailed = false;
  let mandatoryFailReason = '';

  const candidateEdu = candidate.education || [];
  const primaryEdu = candidateEdu[0] || null;

  if (educationReqs.length === 0) {
    // No specific education requirement
    eduScore = 30;
    reasons.push('✓ Open to all educational backgrounds');
  } else {
    // Check requirements
    for (const req of educationReqs) {
      let degreeMatched = false;
      let branchMatched = false;
      let cgpaMatched = false;
      let yearMatched = false;

      if (!req.degree) degreeMatched = true;
      if (!req.branch) branchMatched = true;
      if (!req.minimum_cgpa) cgpaMatched = true;
      if (!req.graduation_year_from && !req.graduation_year_to) yearMatched = true;

      for (const edu of candidateEdu) {
        // Degree match
        if (req.degree && edu.degree) {
          const reqDegrees = req.degree.toLowerCase().split(/[/,]/).map(d => d.trim());
          const candDegree = edu.degree.toLowerCase();
          if (reqDegrees.some(rd => candDegree.includes(rd) || rd.includes(candDegree))) {
            degreeMatched = true;
          }
        }

        // Branch match
        if (req.branch && (edu.branch || edu.specialization)) {
          const reqBranches = req.branch.toLowerCase().split(/[,/]/).map(b => b.trim());
          const candBranch = ((edu.branch || '') + ' ' + (edu.specialization || '')).toLowerCase();
          if (reqBranches.some(rb => candBranch.includes(rb) || rb.includes(candBranch))) {
            branchMatched = true;
          }
        }

        // CGPA / Percentage match
        if (req.minimum_cgpa && edu.cgpa) {
          if (parseFloat(edu.cgpa) >= parseFloat(req.minimum_cgpa)) {
            cgpaMatched = true;
          }
        } else if (req.minimum_percentage && edu.percentage) {
          if (parseFloat(edu.percentage) >= parseFloat(req.minimum_percentage)) {
            cgpaMatched = true;
          }
        }

        // Graduation year match
        const gradYear = edu.end_year ? parseInt(edu.end_year, 10) : null;
        if (gradYear) {
          const fromYear = req.graduation_year_from ? parseInt(req.graduation_year_from, 10) : 1900;
          const toYear = req.graduation_year_to ? parseInt(req.graduation_year_to, 10) : 2100;
          if (gradYear >= fromYear && gradYear <= toYear) {
            yearMatched = true;
          }
        }
      }

      const meetsAll = degreeMatched && branchMatched && cgpaMatched && yearMatched;
      if (meetsAll) {
        eduScore = 30;
        reasons.push('✓ Meets education criteria (' + (req.degree || 'Specified Degree') + ')');
      } else {
        if (req.is_mandatory) {
          mandatoryFailed = true;
          eduEligible = false;
          mandatoryFailReason = 'Education does not satisfy mandatory requirement: ' +
            (!degreeMatched ? 'Degree mismatch (' + req.degree + '); ' : '') +
            (!cgpaMatched ? 'Minimum CGPA required is ' + req.minimum_cgpa + '; ' : '') +
            (!branchMatched ? 'Branch requirement: ' + req.branch + '; ' : '');
        } else {
          // Preferred, partial credit
          eduScore = (degreeMatched ? 15 : 0) + (cgpaMatched ? 10 : 0) + (branchMatched ? 5 : 0);
          reasons.push('⚠ Partially meets preferred education criteria');
        }
      }
    }
  }
  totalScore += eduScore;

  // 2. SKILLS EVALUATION (25%)
  const candSkills = (candidate.skills || []).map(s => (typeof s === 'string' ? s : s.name || s.skill_name || '').toLowerCase().trim());
  const matchedSkills = [];
  const missingSkills = [];

  if (requiredSkills.length === 0) {
    totalScore += 25;
    reasons.push('✓ No specific skill prerequisite');
  } else {
    for (const reqSkill of requiredSkills) {
      const sName = (typeof reqSkill === 'string' ? reqSkill : reqSkill.name || '').toLowerCase().trim();
      if (!sName) continue;
      const found = candSkills.some(cs => cs.includes(sName) || sName.includes(cs));
      if (found) {
        matchedSkills.push(reqSkill.name || reqSkill);
      } else {
        missingSkills.push(reqSkill.name || reqSkill);
      }
    }

    const skillRatio = requiredSkills.length > 0 ? matchedSkills.length / requiredSkills.length : 1;
    const skillScore = Math.round(skillRatio * 25);
    totalScore += skillScore;

    if (matchedSkills.length > 0) {
      reasons.push('✓ ' + matchedSkills.length + ' of ' + requiredSkills.length + ' required skills matched');
    }
    if (missingSkills.length > 0) {
      reasons.push('⚠ Missing skills: ' + missingSkills.slice(0, 3).join(', '));
    }
  }

  // 3. DESIRED ROLE MATCH (15%)
  const preferences = candidate.preferences || {};
  const desiredRoles = Array.isArray(preferences.desired_roles)
    ? preferences.desired_roles
    : (preferences.desired_roles || preferences.preferred_roles || '').split(',').map(r => r.trim()).filter(Boolean);

  if (desiredRoles.length > 0 && job.title) {
    const jobTitleLower = job.title.toLowerCase();
    const roleMatch = desiredRoles.some(r => jobTitleLower.includes(r.toLowerCase()) || r.toLowerCase().includes(jobTitleLower));
    if (roleMatch) {
      totalScore += 15;
      reasons.push('✓ Job title aligns with career goal');
    } else {
      totalScore += 5;
    }
  } else {
    totalScore += 10;
  }

  // 4. EXPERIENCE EVALUATION (10%)
  const candidateExpList = candidate.experience || [];
  const hasExp = candidateExpList.length > 0;
  const isFresherJob = (job.experience_required || '').toLowerCase().includes('0') || (job.experience_required || '').toLowerCase().includes('fresher');

  if (isFresherJob || hasExp) {
    totalScore += 10;
    reasons.push('✓ Experience level is appropriate');
  } else {
    totalScore += 5;
  }

  // 5. LOCATION MATCH (5%)
  const prefLocations = Array.isArray(preferences.preferred_locations)
    ? preferences.preferred_locations
    : (preferences.preferred_locations || '').split(',').map(l => l.trim()).filter(Boolean);

  if (job.work_mode === 'Remote' || prefLocations.length === 0) {
    totalScore += 5;
    reasons.push('✓ Location matches (Remote or flexible)');
  } else if (prefLocations.some(l => (job.location || '').toLowerCase().includes(l.toLowerCase()))) {
    totalScore += 5;
    reasons.push('✓ Location preference matches (' + job.location + ')');
  } else {
    totalScore += 2;
  }

  // 6. JOB TYPE (5%)
  const prefJobTypes = Array.isArray(preferences.job_types)
    ? preferences.job_types
    : (preferences.job_types || preferences.preferred_job_types || '').split(',').map(t => t.trim()).filter(Boolean);

  if (prefJobTypes.length === 0 || prefJobTypes.some(t => (job.job_type || '').toLowerCase().includes(t.toLowerCase()))) {
    totalScore += 5;
    reasons.push('✓ Job type aligns (' + job.job_type + ')');
  } else {
    totalScore += 2;
  }

  // 7. INDUSTRY (5%)
  const prefIndustries = Array.isArray(preferences.preferred_industries)
    ? preferences.preferred_industries
    : (preferences.preferred_industries || '').split(',').map(i => i.trim()).filter(Boolean);

  if (prefIndustries.length === 0 || prefIndustries.some(i => (job.industry || '').toLowerCase().includes(i.toLowerCase()))) {
    totalScore += 5;
  } else {
    totalScore += 2;
  }

  // 8. SALARY / STIPEND (5%)
  totalScore += 5;

  // Cap score at 100
  totalScore = Math.min(100, Math.max(0, Math.round(totalScore)));

  // Categorize match status
  let matchStatus = 'good_match';
  if (totalScore >= 80) matchStatus = 'best_match';
  else if (totalScore >= 60) matchStatus = 'good_match';
  else if (totalScore >= 40) matchStatus = 'partial_match';
  else matchStatus = 'low_match';

  return {
    score: totalScore,
    match_status: matchStatus,
    eligible: !mandatoryFailed,
    mandatoryBlocked: mandatoryFailed,
    mandatoryFailReason: mandatoryFailReason,
    reasons,
    matchedSkills,
    missingSkills,
    breakdown: {
      educationEligible: !mandatoryFailed,
      educationMandatory: educationReqs.some(r => r.is_mandatory),
      reasons,
      matchedSkills,
      missingSkills
    }
  };
}
