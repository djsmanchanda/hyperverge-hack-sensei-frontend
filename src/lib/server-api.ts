import { transformMilestonesToModules } from "./course";

/**
 * Fetches course data and transforms it into modules (server-side version)
 * @param courseId - The ID of the course
 * @param baseUrl - The base URL for the API request
 * @returns Object containing the course data and transformed modules
 */
export const getPublishedCourseModules = async (courseId: string): Promise<{
  courseData: any,
  modules: any[]
}> => {
  const response = await fetch(`${process.env.BACKEND_URL}/courses/${courseId}?only_published=true`, {
    cache: 'no-store'
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Course with ID ${courseId} not found. Please check if the course exists.`);
    } else if (response.status === 500) {
      throw new Error(`Server error when fetching course ${courseId}. Course may not exist or there's a backend issue.`);
    } else {
      throw new Error(`Failed to fetch course data: ${response.status}`);
    }
  }

  const courseData = await response.json();
  
  // Use the shared utility function to transform the milestones to modules
  const modules = transformMilestonesToModules(courseData.milestones);

  return { courseData, modules };
}; 