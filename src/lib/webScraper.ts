import { IncomingMessage } from 'http';
import * as https from 'https';

// Define comprehensive interface for TikTok API response
interface TikTokAuthor {
  id: string;
  uniqueId: string;
  nickname: string;
  avatarThumb: string;
  signature: string;
  verified: boolean;
  followerCount: number;
  followingCount: number;
  heartCount: number;
  videoCount: number;
}

interface TikTokStats {
  diggCount: number;
  shareCount: number;
  commentCount: number;
  playCount: number;
  collectCount: number;
}

interface TikTokMusic {
  id: string;
  title: string;
  authorName: string;
  coverThumb: string;
  playUrl: string;
  duration: number;
}

interface TikTokVideo {
  id: string;
  height: number;
  width: number;
  duration: number;
  ratio: string;
  coverUrl: string;
  playAddr: string;
}

interface TikTokItemStruct {
  id: string;
  desc: string;
  createTime: number;
  video: TikTokVideo;
  author: TikTokAuthor;
  music: TikTokMusic;
  stats: TikTokStats;
  isAd: boolean;
  shareUrl: string;
}

interface TikTokShareMeta {
  title: string;
  desc: string;
}

// Define interface for TikTok API response
export interface TikTokPostData {
  itemInfo?: {
    itemStruct?: TikTokItemStruct;
  };
  shareMeta?: TikTokShareMeta;
  statusCode?: number;
  statusMessage?: string;
}

/**
 * Fetch TikTok video data from a TikTok URL
 * @param url TikTok video URL
 * @returns Promise with TikTok video data
 */
export async function fetchTikTokDataFromUrl(url: string): Promise<TikTokPostData> {
  // Extract video ID from URL
  const idMatch = url.match(/\/video\/(\d+)/);
  if (!idMatch || !idMatch[1]) {
    throw new Error('Could not extract video ID from URL: ' + url);
  }
  
  const videoId = idMatch[1];
  
  return new Promise<TikTokPostData>((resolve, reject) => {
    // Check if API key is available
    const apiKey = process.env.NEXT_PUBLIC_RAPID_API_KEY;
    
    if (!apiKey) {
      reject(new Error('RapidAPI key is not configured. Please set NEXT_PUBLIC_RAPID_API_KEY in your environment.'));
      return;
    }
    
    const options = {
      method: 'GET',
      hostname: 'tiktok-api23.p.rapidapi.com',
      port: null,
      path: `/api/post/detail?videoId=${videoId}`,
      headers: {
        'x-rapidapi-key': apiKey,
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
          // Parse response
          const data = JSON.parse(body.toString()) as TikTokPostData;
          
          // Check for API errors
          if (data.statusCode && data.statusCode !== 200) {
            reject(new Error(`API Error: ${data.statusMessage || 'Unknown error'}`));
            return;
          }
          
          resolve(data);
        } catch (error) {
          reject(new Error('Failed to parse response: ' + body.toString()));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    // Set timeout
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timed out after 10 seconds'));
    });
    
    req.end();
  });
}

/**
 * Helper function to safely access nested properties from TikTok data
 * @param data TikTok post data
 * @returns Object with essential metrics (views, shares, comments, etc)
 */
export function extractTikTokMetrics(data: TikTokPostData) {
  const stats = data?.itemInfo?.itemStruct?.stats;
  const music = data?.itemInfo?.itemStruct?.music;
  
  return {
    views: stats?.playCount || 0,
    shares: stats?.shareCount || 0,
    comments: stats?.commentCount || 0,
    likes: stats?.diggCount || 0,
    author: data?.itemInfo?.itemStruct?.author?.nickname || '',
    description: data?.itemInfo?.itemStruct?.desc || '',
    createdAt: data?.itemInfo?.itemStruct?.createTime 
      ? new Date(data.itemInfo.itemStruct.createTime * 1000).toISOString() 
      : '',
    musicTitle: music?.title || '',
    musicAuthor: music?.authorName || '',
    musicId: music?.id || '',
  };
}