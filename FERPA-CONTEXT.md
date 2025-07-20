# FERPA Legal Context for GradesList Mobile

## Overview
This document provides legal context for developing a personal grade tracking app that accesses student educational records from Canvas and Gradescope APIs.

## What is FERPA?
The Family Educational Rights and Privacy Act (FERPA) is a federal law that protects the privacy of student education records. It applies to educational institutions that receive federal funding.

## Key FERPA Principles
- **Applies to institutions**, not individual students or third-party apps
- **Students own their records** - eligible students (18+ or in postsecondary) have rights to access their own data
- **Institutions control disclosure** - schools must get consent before sharing records with third parties
- **Penalties target institutions** - funding withdrawal, not criminal prosecution

## Our App's Legal Position

### What We Are
- **Personal productivity tool** that students voluntarily use
- **Student-controlled access** - users provide their own credentials
- **Similar to financial apps** like Mint accessing bank data
- **Not educational software** - no school adoption or control

### What We Are NOT
- **Educational institution** subject to FERPA
- **School-adopted technology** requiring institutional compliance
- **Service provider** under direct school control
- **Required coursework tool** mandated by teachers

## Risk Analysis

### Lower Risk Factors ✅
- **Voluntary student use** - no school involvement
- **Student-owned credentials** - users control their own access
- **Personal data organization** - similar to note-taking apps
- **No unauthorized access** - using official APIs with user consent

### Higher Risk Factors ⚠️
- **Accessing educational records** - grades, assignments, course data
- **Third-party data storage** - if we store data on servers
- **Potential data breaches** - security vulnerabilities
- **Terms of service violations** - Canvas/Gradescope may prohibit this

## Legal Compliance Strategy

### FERPA Considerations
- **Document student consent** - clear opt-in for data access
- **Limit data use** - only for personal organization, no selling
- **Implement security** - encryption, secure storage
- **Provide user control** - easy data deletion, export

### Other Legal Requirements
- **Privacy Policy** - transparent about data collection and use
- **Terms of Service** - user agreements and liability limits
- **Data Security** - encryption, access controls, breach protocols
- **State Privacy Laws** - California CCPA, other state regulations

## Penalties and Enforcement

### FERPA Violations
- **No criminal penalties** for FERPA violations alone
- **No jail time** for FERPA violations
- **Administrative penalties** only affect educational institutions
- **Funding withdrawal** is primary enforcement mechanism

### Other Potential Violations
- **Computer Fraud and Abuse Act (CFAA)** - unauthorized system access
- **State privacy laws** - varies by jurisdiction
- **Identity theft** - misuse of student personal information
- **Contract violations** - Canvas/Gradescope terms of service

## Recommendations

### Before Launch
1. **Consult attorney** - get professional legal advice
2. **Review API terms** - ensure Canvas/Gradescope allow this use
3. **Implement security** - encryption, secure authentication
4. **Draft privacy policy** - clear data practices disclosure

### During Development
1. **Minimize data collection** - only collect what's necessary
2. **Encrypt sensitive data** - client-side encryption preferred
3. **Implement user controls** - data export, deletion, access logs
4. **Document consent flows** - clear user agreement processes

### Post-Launch
1. **Monitor compliance** - regular privacy policy updates
2. **Respond to breaches** - incident response procedures
3. **Handle user requests** - data deletion, access requests
4. **Update legal docs** - as laws and regulations change

## Key Distinctions

### Educational Software vs Personal Apps
- **Educational software** - adopted by schools, subject to FERPA
- **Personal apps** - chosen by students, different legal framework
- **Our app** - personal productivity tool, not educational software

### Data Access vs Data Control
- **Schools control** disclosure of educational records
- **Students control** access to their own records
- **Our app** - student-controlled access, not institutional disclosure

## Conclusion
While FERPA creates a complex legal landscape, our app appears to fall into the category of personal productivity tools rather than educational software. The primary risks are related to data security, terms of service compliance, and other privacy laws rather than FERPA violations directly.

**However, this analysis is not legal advice. Consult with a qualified attorney before launching any application that accesses student educational records.**

## Resources
- [FERPA Official Guidance](https://studentprivacy.ed.gov/ferpa)
- [CDC FERPA Overview](https://www.cdc.gov/phlp/php/resources/family-educational-rights-and-privacy-act-ferpa.html)
- [Student Privacy Policy Office](https://studentprivacy.ed.gov/)

---
*This document is for informational purposes only and does not constitute legal advice. Always consult with qualified legal counsel for specific legal questions.*