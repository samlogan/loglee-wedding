import { createClient } from '@sanity/client';
import type { Redirect } from 'next/dist/lib/load-custom-routes';

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  useCdn: true, // set to `false` to bypass the edge cache
  apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION
});

interface SanityRedirect {
  source?: string;
  destination?: string;
  permanent?: boolean;
}

const fetchSanityRedirects = async (): Promise<Redirect[]> => {
  try {
    const query = `*[_type == "settings" && _id == "settings"][0].redirectsArr`;
    const sanityRawRedirects: SanityRedirect[] | null = await client.fetch(query);
    if (!sanityRawRedirects) {
      return [];
    }
    return sanityRawRedirects.reduce<Redirect[]>((accumulator, redirect) => {
      const { source, destination, permanent } = redirect;
      if (!source || !destination) {
        return accumulator;
      }
      accumulator.push({
        destination,
        permanent: permanent ?? false,
        source
      });
      return accumulator;
    }, []);
  } catch (error) {
    console.log('An error occurred while fetching Sanity redirects:', error);
    return [];
  }
};

export default fetchSanityRedirects;
