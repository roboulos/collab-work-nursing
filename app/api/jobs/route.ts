import { NextResponse } from "next/server";

// API endpoint for getting personalized nursing jobs based on email
export async function GET(request: Request) {
  const apiKey = process.env.COLLABWORK_API_KEY;
  const apiUrl = process.env.JOBS_API_URL || 'https://api.collabwork.com/api:partners/get_nursing_form_record_jobs';
  
  console.log('Environment variables:', {
    apiKey: apiKey ? `${apiKey.substring(0, 10)}...` : 'undefined',
    apiUrl: apiUrl,
    nodeEnv: process.env.NODE_ENV,
    allEnvKeys: Object.keys(process.env).filter(key => key.includes('COLLAB') || key.includes('JOBS'))
  });
  
  if (!apiKey) {
    console.error('COLLABWORK_API_KEY is not set');
    return NextResponse.json({ jobs: [] }, { status: 200 });
  }
  
  // Get email parameter from URL, default to chosennurse@hotmail.com
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email') || 'chosennurse@hotmail.com';
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  // Add email and api_key to the URL
  const urlWithParams = `${apiUrl}?email=${encodeURIComponent(email)}&api_key=${apiKey}`;
  
  console.log('Making API request to:', urlWithParams);
  console.log('API key being used:', apiKey);
  
  try {
    const res = await fetch(urlWithParams, { headers });
    console.log('API response status:', res.status);
    
    const data = await res.json();
    console.log('API response data:', data);
    
    // If no jobs found, implement fallback hierarchy
    if (!data.response_jobs || data.response_jobs.length === 0) {
      console.log('No personalized jobs found, implementing fallback hierarchy...');
      
      // Fallback 1: Remote nursing jobs
      try {
        const remoteJobsUrl = `https://api.collabwork.com/api:partners/JobSearchKW?query=nursing+remote&api_key=${apiKey}`;
        const remoteRes = await fetch(remoteJobsUrl, { headers });
        const remoteData = await remoteRes.json();
        
        if (remoteData && Array.isArray(remoteData) && remoteData.length > 0) {
          console.log('Fallback 1: Found remote nursing jobs');
          return NextResponse.json({
            ...data,
            response_jobs: remoteData.slice(0, 5),
            fallback_type: 'remote_nursing'
          });
        }
      } catch (e) {
        console.error('Remote jobs fallback failed:', e);
      }
      
      // Fallback 2: All nursing jobs
      try {
        const allNursingUrl = `https://api.collabwork.com/api:partners/JobSearchKW?query=nursing&api_key=${apiKey}`;
        const allNursingRes = await fetch(allNursingUrl, { headers });
        const allNursingData = await allNursingRes.json();
        
        if (allNursingData && Array.isArray(allNursingData) && allNursingData.length > 0) {
          console.log('Fallback 2: Found all nursing jobs');
          return NextResponse.json({
            ...data,
            response_jobs: allNursingData.slice(0, 5),
            fallback_type: 'all_nursing'
          });
        }
      } catch (e) {
        console.error('All nursing jobs fallback failed:', e);
      }
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching personalized jobs:', error);
    return NextResponse.json({ jobs: [] }, { status: 200 });
  }
}
