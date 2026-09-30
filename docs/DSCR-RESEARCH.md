# DSCR in practice, and what Ind AS says

Researched on 30-09-2026 by Claude from public sources, at the owner's request. The documents on rbi.org.in, bcasonline.org
(ICAI Guidance Note) and srbatliboi.in could not be opened from the session (the environment's network policy blocks
them). What they say is taken here from search results and articles that quote them, marked **secondary**. Nothing
comes from any bank's internal material or from the owner's employer (D-BIZ-01, D-BIZ-02). Where a source is a blog, the
figure is an example of what is said in the market, not a rule.

## 1. The short answer on Ind AS
Ind AS does not define DSCR or set a minimum for it. Minimums are set by each lender (and, for restructuring, by RBI).
Ind AS matters in two ways:
- **It changes the figures that go into DSCR** (Ind AS 116 leases, Ind AS 23 capitalised interest, Ind AS 109 effective
  interest, Ind AS 12 deferred tax; section 6).
- **It decides how a DSCR covenant shows in the accounts**: Ind AS 1 as amended in August 2025 (a breached covenant can
  make a long-term loan current) and the Schedule III ratio disclosure (section 5).

## 2. How chartered accountants prepare it for a bank term loan (India)
- **Formula most often shown:** (profit after tax + depreciation + interest on the term loan) ÷ (term-loan principal
  repaid + interest on the term loan). This is the "common term-loan DSCR" already in `engine/data/dscr.json`.
  Secondary: bankingfinance.in, finpab.com, cred.fastlegal.in.
- **Year by year, then over the loan.** Lenders read the DSCR of every year of the repayment period, and weigh the
  **average over the repayment period** more than any single year. Commonly quoted: an average of about 1.5 and no
  year below about 1.2. Blogs also quote 1.25 for services and trading and 1.5 for manufacturing. These are market
  talk, not regulation; each lender sets its own. Secondary: bankingfinance.in, finpab.com, mudraready.in.
- **The average is usually total ÷ total:** sum of cash available over the repayment years ÷ sum of debt service.
  Some spreadsheets take the simple average of the yearly ratios instead. That is why the method keeps it a choice.
  Secondary: finpab.com.
- **Variants seen:**
  - working-capital interest added to debt service only (it then counts against the borrower twice, since profit is
    already after it);
  - working-capital interest on both sides;
  - lease rentals on both sides.

  The engine offers the consistent ones and never the one-sided one.
- **Used to fix the repayment period.** A rule of thumb in banking articles: where DSCR is high, shorten the
  repayment; where it is low, lengthen it within the maximum allowed. This is what "fewest instalments" and
  "largest loan" do. Secondary: bankingfinance.in.
- **Where it sits.** DSCR is one sheet of a detailed project report (DPR) or of the CMA data prepared by the
  borrower's CA. The usual annexures are:
  - cost of project and means of finance;
  - projected profit and loss, balance sheet and cash flow for five years or more;
  - repayment (interest) schedule and depreciation schedule;
  - DSCR, break-even and ratios.

  CMA data with a DPR is usual for MSME term loans above about Rs. 25 lakh. Secondary: setindiabiz.com,
  caclubindia.com, cred.fastlegal.in.

## 3. Public RBI references
- **Resolution Framework for COVID-19-related stress, financial parameters** (RBI/2020-21/34,
  DOR.No.BP.BC/13/21.04.048/2020-21, 7 September 2020). Secondary: rvks.in, vinodkothari.com, legal500.com.
  - **DSCR** for the relevant year = (net cash accruals + interest and finance charges) ÷ (current portion of
    long-term debt + interest and finance charges).
  - **Average DSCR** = the same totals over the period of the loan.
  - **Floors in all cases:** DSCR 1.0 or more; average DSCR 1.2 or more.
  - Sector thresholds are in the annex. Airlines and roads are treated differently.
  - This uses all interest and finance charges, not only term-loan interest.
- **Reserve Bank of India (Project Finance) Directions, 2025** (issued 19 June 2025, in force 1 October 2025).
  - They consolidate the project-lending norms.
  - Some blogs say they fix a minimum average DSCR of 1.25. No legal summary found confirms this, so it is **not used**.
    Secondary: khaitanco.com, amsshardul.com.
- **Older restructuring "viability benchmarks"** (RBI master circular annex): not confirmed in any source read in this
  session, so **not used**.

## 4. Consultants, project finance and CFA-style credit analysis
- **Project finance (consultants, CFA charterholders in infrastructure lending).**
  - The numerator is **CFADS**, cash flow available for debt service: EBITDA − cash taxes ± change in working capital
    − maintenance capital spending. It is cash, not accounting profit.
  - DSCR for each period = CFADS ÷ (principal + interest).
  - Lenders set a minimum and an average DSCR as conditions before lending. Around 1.30 is typical for contracted
    infrastructure, depending on the sector.
  - **LLCR** (loan life cover ratio) = present value of CFADS over the remaining loan ÷ debt outstanding.
  - **Sculpting** sets each repayment so that every period's DSCR equals the target, instead of equal instalments.
  - Secondary: breakingintowallstreet.com, financialmodelling.forvismazars.com, numeritas.co.uk, wallstreetprep.com.
- **Corporate credit analysis (CFA curriculum).** Coverage is read with several ratios:
  - EBITDA ÷ interest and EBIT ÷ interest;
  - funds from operations ÷ debt, and debt ÷ EBITDA;
  - fixed-charge cover;
  - DSCR as EBITDA (or operating cash flow) ÷ total debt service.

  Secondary: analystprep.com, corporatefinanceinstitute.com.
- **What differs from the Indian bank method:** "profit after tax + depreciation + interest" ignores working-capital
  changes and capital spending. The project-finance method is stricter. A CFADS-based DSCR, LLCR and sculpted
  repayment are candidates for the project report phase, not for this tool now.

## 5. Schedule III and the ICAI Guidance Note (annual accounts)
- **The disclosure.** Since FY 2021-22 (MCA notification G.S.R. 207(E), 24 March 2021), companies disclose DSCR among
  eleven ratios in the notes to accounts. They say what is in the numerator and denominator, and explain any ratio
  that moves by more than 25% from the previous year. Secondary: taxguru.in (Schedule III analyses).
- **The ICAI Guidance Note** (Division II, Ind AS companies; Division I has the same ratio):
  - DSCR = earnings available for debt service ÷ debt service;
  - earnings = profit after tax + non-cash operating expenses (depreciation, amortisation) + interest + other
    adjustments such as a loss on sale of fixed assets;
  - debt service = interest and lease payments + principal repayments.

  Secondary: taxguru.in, search summaries of the Guidance Note.
- **A historical ratio.** It is one year's figure from the accounts, not a projection over the loan. It counts all
  interest and lease payments.

## 6. Ind AS points that change the figures
- **Ind AS 116, leases.** Lease rentals leave operating costs; the right-of-use asset is depreciated and the lease
  liability bears interest.
  - EBITDA rises, and gearing and interest cover change, so ratio covenants can be hit without any change in cash.
    Secondary: nexdigm.com, cleartax.in.
  - For DSCR, lease payments (principal and interest of the lease liability) are debt service, as in the Schedule III
    formula.
  - Take lease rentals **either** as "lease rentals" on both sides **or** through right-of-use depreciation and lease
    interest, never both.
- **Ind AS 23, borrowing costs.** Interest on a loan for an asset under construction is capitalised, so it is not in
  profit and loss. It is still paid unless it is funded as part of the project cost. Debt service in construction
  years includes it even though profit does not show it. Secondary: Ind AS 23 summaries.
- **Ind AS 109, effective interest.** Processing fees and similar costs are spread over the loan as interest, so the
  finance cost in the accounts is more than the interest payable. For DSCR use the interest actually payable, or add
  back the non-cash part. Secondary: taxguru.in, s3solutions.in.
- **Ind AS 12, deferred tax.** Deferred tax is not cash. Profit after tax includes it, so add it back as a non-cash
  charge, or work from current tax.
- **Ind AS 1 as amended, covenants.** Companies (Indian Accounting Standards) Second Amendment Rules, 2025,
  G.S.R. 549(E), notified 13 August 2025. Secondary: taxguru.in, KPMG First Notes (September 2025),
  srbatliboi.in via search, taxmann.com.
  - From FY 2025-26, a loan is non-current only if, at the reporting date, the company can defer settlement for at
    least twelve months.
  - Covenants to be met after the reporting date do not change the classification. They must be disclosed: the
    carrying amount, the covenants, and the facts and circumstances suggesting difficulty in meeting them.
  - The Indian carve-out in paragraph 74 (a lender's waiver received after the reporting date keeps the loan
    non-current) applies for FY 2025-26 only, and **is removed from FY 2026-27**.
  - So a DSCR covenant breached at 31 March 2027 makes the loan current unless it was waived by that date.
- **Not re-checked in this session:** Ind AS 107 disclosure of defaults and breaches of loan agreements, and Ind AS 10
  treatment of a waiver received after the reporting date. They are stated in the standards but were not looked up,
  so treat them as approximate.

## 7. What this changes in the product (decided in P1b, 30-09-2026)
- **Presets.** "Common term-loan DSCR" stays the first choice, because it is how CAs and banks do it for term loans.
  Two more presets, each answering all four choices at once and each "not yet checked" until the owner confirms:
  - "RBI resolution framework (2020)": all interest, every year of the loan;
  - "As in the annual accounts (Schedule III)": all interest, lease payments counted.
- **The statement in the CA layout,** years as columns:
  - the profit build-up when the page works it out (profit before interest, depreciation and tax down to profit
    after tax);
  - cash available, debt service, DSCR, average and lowest year;
  - the **repayment schedule**, with totals by year and every month.
- **Tax by borrower type.** Rates as found for AY 2026-27; not yet checked for FY 2026-27 onwards:
  - a company on the concessional rate: 25.168% (22% + 10% surcharge + 4% cess; section 115BAA, now section 200 of
    the Income-tax Act, 2025);
  - a firm or LLP: 31.2%, or 34.944% where income is above Rs. 1 crore.

  Secondary: taxmann.com, caalley.com, incometax.gov.in help pages via search.
- **Later, not now:**
  - CFADS-based DSCR with working capital and capital spending;
  - LLCR and sculpted repayment;
  - interest cover (ISCR);
  - depreciation from asset cost;
  - drawings for a proprietor.

## 8. The owner's call
- Which presets to show, and in what order.
- Whether any lender the owner serves uses the simple average.
- The benchmark figures to offer as examples.
- Whether the one-sided working-capital variant should be offered at all. It is left out now.

## Sources (opened = read directly; otherwise via search results)
- RBI resolution framework, 7 Sep 2020: https://www.rbi.org.in/commonman/Upload/English/Notification/PDFs/34COVID19122F09F4AE2A4C96B5A89E8250A5FF7F.PDF (not opened); summaries: https://rvks.in/blogs/resolution-framework-for-covid-19-related-stress-financial-parameters-rbi/ , https://vinodkothari.com/2020/09/faqs-on-resolution-of-loan-accounts-under-covid-19-stress/
- RBI (Project Finance) Directions, 2025: https://www.khaitanco.com/sites/default/files/2025-07/ERGO%20-%20RBI%20Project%20Finance%20Directions%20-%208%20July%202025_0.pdf , https://www.amsshardul.com/wp-content/uploads/2025/06/Client-Update-RBI-Master-Directions-on-Project-Finance.pdf
- ICAI Guidance Note, Division II: https://bcasonline.org/wp-content/uploads/2023/04/GN_on_Sch_III-Division-II.pdf (not opened); https://taxguru.in/company-law/analysis-companies-act-schedule-iii-amendment-applicable-wef-01-04-2022.html
- Ind AS 1 amendments: https://taxguru.in/chartered-accountant/liability-classification-ind-1-impact-2025-amendment.html , https://kpmg.com/in/en/insights/2025/09/firstnotes-recent-amendments-to-ind-as.html , https://taxguru.in/company-law/companies-indian-accounting-standards-second-amendment-rules-2025.html , https://www.taxmann.com/post/blog/ind-as-loan-covenant-classification-non-current-vs-current
- CA and bank practice: https://www.bankingfinance.in/term-loan-appraisal-dscr.html , https://www.finpab.com/pages/resources/blog/dscr-debt-service-coverage-ratio , https://mudraready.in/blog/project-report-for-bank-loan , https://www.setindiabiz.com/project-report-for-bank-loan , https://www.caclubindia.com/articles/project-report-for-bank-loan-48415.asp
- Project finance: https://breakingintowallstreet.com/kb/project-finance/debt-service-coverage-ratio/ , https://financialmodelling.forvismazars.com/resources/debt-service-coverage-ratio-dscr/ , https://numeritas.co.uk/resources/pf-basics-part-3-an-overview-of-the-dscr/ , https://www.wallstreetprep.com/knowledge/debt-sizing-in-project-finance/
- Credit analysis: https://analystprep.com/cfa-level-1-exam/fixed-income/financial-ratios-credit-analysis/ , https://corporatefinanceinstitute.com/resources/commercial-lending/debt-service-coverage-ratio/
- Ind AS 116, 23, 109: https://www.nexdigm.com/insights_post/ind-as-116-lease-accounting-guide/ , https://cleartax.in/s/ind-as-116-leases , https://taxguru.in/chartered-accountant/accounting-borrowings-loans-ind-as.html
- Tax rates: https://www.taxmann.com/post/blog/tax-rates-surcharge-cess , https://caalley.com/cas-referencer/income-tax-rates-ay-2026-27-and-2025-26 , https://www.taxtmi.com/tmi_notes?id=1665
