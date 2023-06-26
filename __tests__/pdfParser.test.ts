import path from "path";
import fs from "fs";
import { pdfToText } from "../lib/pdfReader";
import { describe, expect, it } from "@jest/globals";

describe("PDF Parser", () => {
  it("LOA PDF", async () => {
    const pdfName = "LOA_superflows-sign-in_413.pdf";
    const filePath = path.join(process.cwd(), "__tests__", "testData", pdfName);
    if (!fs.existsSync(filePath)) {
      throw Error("Test file doesn't exist!");
    }

    const data = await fs.promises.readFile(filePath);
    const text = await pdfToText(data);
    expect(text).toBe(
      "App Defense Alliance | CASA\r\n" +
        "Validation Repo\u0000\r\n" +
        "Application Name: superflows-sign-in Case ID: 413\r\n" +
        "Application URL: https://app.superflows.ai Application Type: Web\r\n" +
        "Assessment Type: TIER 2 Issue Date: 2/28/2023\r\n" +
        "Assessment Status: Complete Expiration Date: 2/27/2024\r\n" +
        "Statement of Validation\r\n" +
        "The purpose of this report is to provide users verification that Learney AI Ltd has successfully completed a Cloud\r\n" +
        "Application Security Assessment (CASA) Assessment, validating superflows-sign-in has satisfied CASA application\r\n" +
        "security requirements for Web application set forth by the App Defense Alliance (ADA). This assessment includes:\r\n" +
        "● A review of application conformance with CASA recognized security frameworks (if applicable)km\r\n" +
        "● Verification that automated security test (AST) application scan results of superflows-sign-in against functional\r\n" +
        "CASA requirements contain:\r\n" +
        "○ No findings linked to common weakness enumerations (CWEs) with high likelihood of exploit\r\n" +
        "○ No findings linked to CWEs with medium likelihood of exploit (*only applicable for CASA revalidation)\r\n" +
        "● Verification of conformation to non-functional CASA requirements, validated through a self-attestation survey\r\n" +
        "In meeting these assessment requirements, superflows-sign-in is verified to meet the CASA TIER 2 requirements.\r\n" +
        "About CASA\r\n" +
        "As global ecosystems of applications, platforms, and systems evolve and connect through complex cloud-to-cloud\r\n" +
        "integrations, an established and industry-recognized application securitization standard becomes evermore paramount to\r\n" +
        "guarding consumer data and privacy. At risk in this evolution are non-hardened applications exchanging data with secure\r\n" +
        "cloud infrastructure through trusted data sharing integrations. Thus introducing: CASA.\r\n" +
        "CASA is based on the industry-recognized Open Web Application Security Project (OWASP) Application Security\r\n" +
        "Verification Standard (ASVS) to provide third-party (3P) application developers with: (1) a basis for testing technical\r\n" +
        "application security controls, (2) a consistent set of requirements for secure application development, and (3)\r\n" +
        "homogenized coverage and assurance levels for providing security verification using industry-aligned frameworks and\r\n" +
        "open security standards.\r\n" +
        "More information on CASA, including a complete list of CASA requirements can be located\r\n" +
        "on the CASA developer site.\r\n" +
        "_______________________________________________________________________________________________________________________\r\n" +
        "Cloud Application Security Assessment\r\n" +
        "Verified Self Assessment (Tier 2) Validation Report\n\n"
    );
  });
  it("Henry CV PDF", async () => {
    const pdfName = "Henry-Pulver-CV.pdf";
    const filePath = path.join(process.cwd(), "__tests__", "testData", pdfName);
    if (!fs.existsSync(filePath)) {
      throw Error("Test file doesn't exist!");
    }

    const data = await fs.promises.readFile(filePath);
    const text = await pdfToText(data);
    expect(text).toBe(
      "Henry Pulver B henrypulver@hotmail.co.uk\r\n" +
        ": Henry Pulver\r\n" +
        "EDUCATION\r\n" +
        "2016–2020 \n" +
        "MEng: Information & Computer Engineering, Emmanuel College, Cambridge University\r\n" +
        "Master’s Thesis: ‘Reinforcement Learning for Automation’ - Class 1 4 th \n" +
        "Year result: 3 rd \n" +
        "Year result: 2 nd \n" +
        "Year result: 1 st \n" +
        "Year result:\r\n" +
        "Pass (Due to COVID, this was Pass/Fail) Class 2.i (32 nd \n" +
        "percentile) Class 1 (18 th \n" +
        "percentile) Class 1 (28 th percentile)\r\n" +
        "Received Rowley Mainhood Prize and Frank Marriott Scholarship for academic achievement.\r\n" +
        "Courses studied\r\n\r\n" +
        "- Deep Learning and Structured Data\r\n" +
        "- Advanced Information Theory and Coding\r\n" +
        "- Computational Neuroscience\r\n" +
        "- Robotics\r\n" +
        "- Probabilistic Machine Learning\r\n" +
        "- Computer Architecture and Parallelism\r\n" +
        "- Computer Vision - Inference\r\n" +
        "EXPERIENCE\r\n" +
        "2020 FiveAI Internship: ML Research Engineer\r\n" +
        "{ Research project applying Imitation Learning to motion planning for autonomous driving\r\n" +
        "{ Project aim is to determine the effectiveness of this approach and publish the results to ICRA 2021\r\n" +
        "2019 FiveAI Internship: Software Engineering\r\n" +
        "{ 13-week internship working on two teams: Data team and Perception team\r\n" +
        "2018–2020 Cambridge University Machine Intelligence Network (CUMIN)\r\n" +
        "{ Co-founded society, voted in as President for 2019/20\r\n" +
        "{ Organised, publicised and ran talks from DeepMind, Google AI, Apple, Samsung AI and PROWLER\r\n" +
        "2019 CUMIN ’Animal AI Olympics’ Team\r\n" +
        "{ Set up and led team competing in NeurIPS Reinforcement Learning competition\r\n" +
        "{ Main contributor to codebase as team won $500 AWS credit prize\r\n" +
        "2018 Metaswitch Internship: Software Engineering\r\n" +
        "{ 11-week internship on a scrum team developing a new product for telecoms industry\n\n"
    );
  });
});
