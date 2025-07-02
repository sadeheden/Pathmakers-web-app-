import fs from "fs/promises";

const FILE_PATH = "data/attractions.json";

const fileExists = async (filePath) => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

const readJsonFile = async (filePath) => {
  try {
    if (!(await fileExists(filePath))) {
      await fs.writeFile(filePath, JSON.stringify({ attractions: [] }, null, 2));
      return { attractions: [] }; // מחזירים אובייקט עם מערך "attractions"
    }
    const data = await fs.readFile(filePath, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading file:", error);
    return { attractions: [] }; // מחזירים אובייקט עם מערך ריק במקרה של שגיאה
  }
};

export const getAttractionsByCity = async (city) => {
  const attractionsData = await readJsonFile(FILE_PATH);
  const cityLowerCase = city.toLowerCase();

  const cityAttractionEntry = attractionsData.attractions.find(
    (entry) => entry.city.toLowerCase() === cityLowerCase
  );

  if (!cityAttractionEntry) {
    return [];
  }

  return cityAttractionEntry.attractions; // Return the direct array of attractions
};
