import { useEffect, useState } from 'react';

const IP2_LOCATION_API_KEY = process.env.GATSBY_IP2_LOCATION_API_KEY;

interface UseIpDataProps {
  disabled?: boolean;
}

interface IpData {
  country_name?: string;
  country_code2?: string;
  state_prov?: string;
  city?: string;
  zipcode?: string;
  latitude?: string;
  longitude?: string;
  ip?: string;
}

const useIpData = (props?: UseIpDataProps): IpData | undefined => {
  const { disabled = false } = props || {};
  const [ipData, setIpData] = useState<IpData>();

  useEffect(() => {
    if (disabled) {
      return;
    }

    let cancelled = false;

    const fetchIp = async () => {
      try {
        const response = await fetch(`https://api.ipgeolocation.io/ipgeo?apiKey=${IP2_LOCATION_API_KEY}`, {
          method: 'GET'
        });
        const data = await response.json();
        if (!cancelled) {
          setIpData(data);
        }
      } catch (error: unknown) {
        console.log('An error occured while fetching IP data.', error instanceof Error ? error.message : error);
      }
    };

    fetchIp();

    return () => {
      cancelled = true;
    };
  }, [disabled]);

  return ipData;
};

export default useIpData;
