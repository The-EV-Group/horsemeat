// Test the new table-based Affinda mapper
console.log('=== Testing New Table-Based Affinda Mapper ===\n');

// Sample data from the new Affinda response structure
const newSampleData = {
  fullName: {
    raw: "Garrison Gagnon",
    parsed: "Garrison Gagnon"
  },
  email: {
    raw: "gsquared0236@gmail.com",
    parsed: "gsquared0236@gmail.com"
  },
  phoneNumber: {
    raw: "(603) 325-7987",
    parsed: {
      rawText: "(603) 325-7987",
      countryCode: "US",
      nationalNumber: "(603) 325-7987",
      formattedNumber: "+1 603-325-7987",
      internationalCountryCode: 1
    }
  },
  location: {
    raw: "Gilmanton Iron Works, NH 03837",
    parsed: {
      formatted: "Gilmanton Iron Works, Gilmanton, NH 03837, USA",
      streetNumber: null,
      street: null,
      apartmentNumber: null,
      city: "Gilmanton",
      postalCode: "03837",
      state: "New Hampshire",
      stateCode: "NH",
      country: "United States",
      rawInput: "Gilmanton Iron Works, NH 03837",
      countryCode: "US",
      latitude: 43.4254906,
      longitude: -71.2963297,
      poBox: null
    }
  },
  goalsInterests: {
    raw: "Determined and team-oriented student with an upcoming Summer 2025 audit internship at Ernst & Young, seeking to further develop interpersonal, leadership, and financial skills in an interactive and impactful organization.",
    parsed: "Determined and team - oriented student with an upcoming Summer 2025 audit internship at Ernst & Young, seeking to further develop interpersonal, leadership, and financial skills in an interactive and impactful organization."
  },
  skillsTable: {
    id: 1171558052,
    raw: "--Information Systems ofStatistical control sale Analysis interpersonal, Structures (POS) pointinventory",
    parsed: {
      rows: [
        {
          id: 1171558053,
          raw: "interpersonal,",
          parsed: {
            skill: [
              {
                raw: "interpersonal,",
                parsed: "interpersonal"
              }
            ]
          }
        },
        {
          id: 1171558055,
          raw: "Statistical Analysis",
          parsed: {
            skill: [
              {
                raw: "Statistical Analysis",
                parsed: "Statistical Analysis"
              }
            ]
          }
        },
        {
          id: 1171558057,
          raw: "Information Systems Structures",
          parsed: {
            skill: [
              {
                raw: "Information Systems Structures",
                parsed: "Information Systems Structures"
              }
            ]
          }
        }
      ]
    }
  },
  jobTitlesTable: {
    id: 1171558044,
    raw: "Tax Intern Fellow",
    parsed: {
      rows: [
        {
          id: 1171558045,
          raw: "Tax Intern",
          parsed: {
            jobTitle: [
              {
                raw: "Tax Intern",
                parsed: "Tax Intern"
              }
            ]
          }
        },
        {
          id: 1171558047,
          raw: "Fellow",
          parsed: {
            jobTitle: [
              {
                raw: "Fellow",
                parsed: "Fellow"
              }
            ]
          }
        }
      ]
    }
  },
  companiesTable: {
    id: 1171558049,
    raw: "& Ernst Young,",
    parsed: {
      rows: [
        {
          id: 1171558050,
          raw: "Ernst & Young,",
          parsed: {
            company: [
              {
                raw: "Ernst & Young,",
                parsed: "Ernst & Young"
              }
            ]
          }
        }
      ]
    }
  },
  industriesTable: {
    id: 1171558066,
    raw: "Accounting",
    parsed: {
      rows: [
        {
          id: 1171558067,
          raw: "Accounting",
          parsed: {
            industry: [
              {
                raw: "Accounting",
                parsed: "Accounting"
              }
            ]
          }
        }
      ]
    }
  },
  certificationsTable: {
    id: 1171558063,
    raw: "Beta Gamma Sigma International Business Honors Society Member",
    parsed: {
      rows: [
        {
          id: 1171558064,
          raw: "Beta Gamma Sigma International Business Honors Society Member",
          parsed: {
            certification: [
              {
                raw: "Beta Gamma Sigma International Business Honors Society Member",
                parsed: "Beta Gamma Sigma International Business Honors Society Member"
              }
            ]
          }
        }
      ]
    }
  }
};

// Test the extraction functions
console.log('--- Testing Basic Info Extraction ---');
console.log('Full Name:', newSampleData.fullName?.parsed || 'NOT FOUND');
console.log('Email:', newSampleData.email?.parsed || 'NOT FOUND');
console.log('Phone (raw):', newSampleData.phoneNumber?.raw || 'NOT FOUND');
console.log('Phone (cleaned):', newSampleData.phoneNumber?.raw?.replace(/\D/g, '') || 'NOT FOUND');
console.log('Location City:', newSampleData.location?.parsed?.city || 'NOT FOUND');
console.log('Location State:', newSampleData.location?.parsed?.stateCode || 'NOT FOUND');
console.log('Location Zip:', newSampleData.location?.parsed?.postalCode || 'NOT FOUND');
console.log('Street Address:', newSampleData.location?.parsed?.rawInput?.split(',')[0] || 'NOT FOUND');
console.log('Goals/Interests:', newSampleData.goalsInterests?.parsed?.substring(0, 100) + '...' || 'NOT FOUND');

console.log('\n--- Testing Table-Based Keyword Extraction ---');

// Test skills table
if (newSampleData.skillsTable) {
  console.log(`\nSkills Table (${newSampleData.skillsTable.parsed.rows.length} rows):`);
  newSampleData.skillsTable.parsed.rows.forEach((row, i) => {
    console.log(`  Row ${i + 1}: "${row.raw}"`);
    if (row.parsed.skill) {
      row.parsed.skill.forEach((skill, j) => {
        console.log(`    Skill ${j + 1}: "${skill.parsed}"`);
      });
    }
  });
}

// Test job titles table
if (newSampleData.jobTitlesTable) {
  console.log(`\nJob Titles Table (${newSampleData.jobTitlesTable.parsed.rows.length} rows):`);
  newSampleData.jobTitlesTable.parsed.rows.forEach((row, i) => {
    console.log(`  Row ${i + 1}: "${row.raw}"`);
    if (row.parsed.jobTitle) {
      row.parsed.jobTitle.forEach((title, j) => {
        console.log(`    Job Title ${j + 1}: "${title.parsed}"`);
      });
    }
  });
}

// Test companies table
if (newSampleData.companiesTable) {
  console.log(`\nCompanies Table (${newSampleData.companiesTable.parsed.rows.length} rows):`);
  newSampleData.companiesTable.parsed.rows.forEach((row, i) => {
    console.log(`  Row ${i + 1}: "${row.raw}"`);
    if (row.parsed.company) {
      row.parsed.company.forEach((company, j) => {
        console.log(`    Company ${j + 1}: "${company.parsed}"`);
      });
    }
  });
}

// Test industries table
if (newSampleData.industriesTable) {
  console.log(`\nIndustries Table (${newSampleData.industriesTable.parsed.rows.length} rows):`);
  newSampleData.industriesTable.parsed.rows.forEach((row, i) => {
    console.log(`  Row ${i + 1}: "${row.raw}"`);
    if (row.parsed.industry) {
      row.parsed.industry.forEach((industry, j) => {
        console.log(`    Industry ${j + 1}: "${industry.parsed}"`);
      });
    }
  });
}

// Test certifications table
if (newSampleData.certificationsTable) {
  console.log(`\nCertifications Table (${newSampleData.certificationsTable.parsed.rows.length} rows):`);
  newSampleData.certificationsTable.parsed.rows.forEach((row, i) => {
    console.log(`  Row ${i + 1}: "${row.raw}"`);
    if (row.parsed.certification) {
      row.parsed.certification.forEach((cert, j) => {
        console.log(`    Certification ${j + 1}: "${cert.parsed}"`);
      });
    }
  });
}

console.log('\n=== Expected Results ===');
console.log('Skills: interpersonal, Statistical Analysis, Information Systems Structures');
console.log('Job Titles: Tax Intern, Fellow');
console.log('Companies: Ernst & Young');
console.log('Industries: Accounting');
console.log('Certifications: Beta Gamma Sigma International Business Honors Society Member');

console.log('\n=== Test Complete ===');