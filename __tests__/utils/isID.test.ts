import { describe, it, expect } from "@jest/globals";
import { isEmail, isID, isName, isPhoneNumber } from "../../lib/utils";

const IDs = [
  "id_zx25p",
  "id_5917oskGI",
  "id-201pdajwk",
  "apiID_926k7s19J",
  "ide2487HG",
  "myId_s439fT",
  "myid_q14Z6Pskajevsadjssja",
  "obj917Id_xlbRI65G",
  "rnd833Id_6PcaxEq",
  "ID_genYTe89739p",
  "TrckId_Gn57F89Nj",
  "uniqID_q579SoL6",
  "Id_ref87Ty2Ug",
  "userID_i47yHJ2pA",
  "compID_x2984HZ9g",
  "id_Value849qZPzmV",
  "ItemID_p56CNjs19",
  "dataID_r42A752X",
  "ID_s3721aZ_ID",
  "userID_j549MbpEgZ2931fjds",
];

const notIDs = [
  "apple_green_394",
  "educational_5Books",
  "red_robin_1897",
  "gentle_ocean_breeze",
  "gadget360Drive",
  "pink_rose_Petals62",
  "mystic_foggy_morning",
  "winter_snowflake_01",
  "elephant_in_room9",
  "wild_horses_run67",
  "quiet_night_sky98",
  "digital_cam_ph5",
  "small_village_sunset",
  "robust_tea_flavor76",
  "calming_sea_waves30",
  "golden_field_harvest55",
  "skyscraper_urban_view09",
  "summer_sunflower_garden37",
  "blue_bird_joyfulChirp",
  "mountain_majesticView01",
];

describe("isID", () => {
  it("test single id", () => {
    const id = "id_zjdklsjfklsd25p";
    expect(isID(id)).toBe(true);
  });

  it("percent correct test", () => {
    let truePositive = 0;
    for (const id of IDs) {
      if (isID(id)) {
        truePositive += 1;
      }
    }

    let trueNegative = 0;
    for (const id of notIDs) {
      if (!isID(id)) {
        trueNegative += 1;
      }
    }

    // False positives are pretty bad and want to avoid completely
    expect(trueNegative).toEqual(notIDs.length);
    expect(truePositive / IDs.length).toBeGreaterThan(0.8);
  });
});

const exampleEmails = [
  "example@example.com",
  "something-hyphenated@gmail.com",
  "hyphenateddomain@go-away.com",
  "another@domain.io",
  "numbers123@domain.co.uk",
  "domainwithnumbers@123go.io",
];

const exampleNonEmails = [
  "example@example",
  "something-hyphenated@",
  "hyphenateddomain@go-away",
];

describe("isEmail", () => {
  it("example emails", () => {
    for (const email of exampleEmails) {
      expect(isEmail(email)).toBe(true);
    }
  });
  it("example non emails", () => {
    for (const email of exampleNonEmails) {
      expect(isEmail(email)).toBe(false);
    }
  });
});

const examplePhoneNumbers = [
  "+1-800-123-4567",
  "1 800 123 4567",
  "(800)123-4567",
  "800-123-4567",
  "800.123.4567",
  "+44 (0) 20 7123 4567",
  "1.800.123.4567",
  "18001234567",
  "+918001234567",
  "1234567890",
];

const exampleNonPhoneNumbers = [
  "+1-800-12-4567 7987",
  "1 800 123 45678 67987",
  "(800)1230-45-6-7",
  "800-123----4567",
  "800.123.45.67.8",
  "+44h (0) 20 7123 4567",
  "1.t800.123.4567",
  "180012345678910",
  "+918001234567 ",
  "1234567890-",
];

describe("isPhoneNumber", () => {
  it("example phone numbers", () => {
    for (const phoneNumber of examplePhoneNumbers) {
      expect(isPhoneNumber(phoneNumber)).toBe(true);
    }
  });
  it("example non phone numbers", () => {
    for (const phoneNumber of exampleNonPhoneNumbers) {
      expect(isPhoneNumber(phoneNumber)).toBe(false);
    }
  });
});

const exampleNames = [
  // Short names (strings <10 chars) are ignored by isId() function
  "James Rowland",
  "James Rowland Jr.",
  "Henry Herbett-Brown",
  "Smith, Brown and Sons",
];
const exampleNonNames = ["jimbob202", "x2984HZ9g23lgs"];

describe("isName", () => {
  it("example names", () => {
    for (const name of exampleNames) {
      console.log(name);
      expect(isName(name)).toBe(true);
    }
  });
  it("example non names", () => {
    for (const name of exampleNonNames) {
      expect(isName(name)).toBe(false);
    }
  });
});
