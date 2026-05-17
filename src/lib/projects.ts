import { getCollection } from 'astro:content';

export async function getSortedProjects() {
  return (await getCollection('projects')).sort((a, b) => a.data.order - b.data.order);
}

export async function getFeaturedProjects() {
  return (await getSortedProjects()).filter((project) => project.data.featured);
}
