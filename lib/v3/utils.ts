export function ISOMonthsToReadable(dates: string[]): string {
  // Sort by date
  dates.sort();

  // Create mapping for month names
  const monthNames: { [key: number]: string } = {
    1: "January",
    2: "February",
    3: "March",
    4: "April",
    5: "May",
    6: "June",
    7: "July",
    8: "August",
    9: "September",
    10: "October",
    11: "November",
    12: "December",
  };

  let formattedDates: string[] = [];

  for (let i = 0; i < dates.length; i++) {
    const date = dates[i];
    let [year, month] = date.split("-").map(Number);

    if (
      i + 1 === dates.length ||
      dates[i + 1].split("-").map(Number)[0] !== year
    ) {
      // If the current year is the last one, add month and year
      formattedDates.push(`${monthNames[month]} ${year}`);
    } else {
      // If the current year is the same as the next one, just add month
      formattedDates.push(`${monthNames[month]}`);
    }
  }

  // Return as a formatted string, joining by 'and' if there's more than one item
  return formattedDates.length > 1
    ? `${formattedDates.slice(0, -1).join(", ")} and ${
        formattedDates[formattedDates.length - 1]
      }`
    : formattedDates[0];
}
