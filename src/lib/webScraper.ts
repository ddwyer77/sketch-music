import { IncomingMessage } from 'http';
import * as https from 'https';

// Define interface for TikTok API response
interface TikTokPostData {
  itemInfo?: {
    itemStruct?: {
      stats?: {
        playCount: number;
        shareCount: number;
        commentCount: number;
        [key: string]: unknown;
      };
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export async function fetchTikTokDataFromUrl(url: string): Promise<TikTokPostData> {
  // Extract video ID from URL
  const idMatch = url.match(/\/video\/(\d+)/);
  if (!idMatch || !idMatch[1]) {
    throw new Error('Could not extract video ID from URL: ' + url);
  }
  
  const videoId = idMatch[1];
  
  return new Promise<TikTokPostData>((resolve, reject) => {
    const options = {
      method: 'GET',
      hostname: 'tiktok-api23.p.rapidapi.com',
      port: null,
      path: `/api/post/detail?videoId=${videoId}`,
      headers: {
        'x-rapidapi-key': process.env.NEXT_PUBLIC_RAPID_API_KEY,
        'x-rapidapi-host': 'tiktok-api23.p.rapidapi.com'
      }
    };
    
    const req = https.request(options, (res: IncomingMessage) => {
      const chunks: Buffer[] = [];
    
      res.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });
    
      res.on('end', () => {
        const body = Buffer.concat(chunks);
        try {
          const data = JSON.parse(body.toString()) as TikTokPostData;
          resolve(data);
        } catch (error) {
          reject(new Error('Failed to parse response: ' + body.toString()));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.end();
  });
}