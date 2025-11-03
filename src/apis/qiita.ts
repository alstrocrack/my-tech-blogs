import { readFile } from 'fs/promises';
import { join } from 'path';
import axios from 'axios';

const QIITA_API_URL = 'https://qiita.com/api/v2/items';

interface QiitaArticleRequest {
  title: string;
  body: string;
  tags: Array<{ name: string }>;
  private: boolean;
  tweet?: boolean;
}

interface QiitaArticleResponse {
  id: string;
  url: string;
  title: string;
}

/**
 * マークダウンファイルからタイトルを抽出する
 * 最初の見出し（#で始まる行）からタイトルを取得
 */
function extractTitle(content: string): string {
  const lines = content.split('\n');
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith('# ')) {
      return trimmedLine.substring(2).trim();
    }
  }
  // タイトルが見つからない場合はファイル名を使用
  return 'Untitled';
}

/**
 * マークダウンファイルからタグを抽出する
 * フロントマターから取得（将来的な拡張用）
 */
function extractTags(content: string): string[] {
  // フロントマターのパース（将来的な拡張用）
  const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);
  if (frontmatterMatch && frontmatterMatch[1]) {
    const frontmatter = frontmatterMatch[1];
    const tagsMatch = frontmatter.match(/tags:\s*\[([^\]]+)\]/);
    if (tagsMatch && tagsMatch[1]) {
      return tagsMatch[1]
        .split(',')
        .map((tag) => tag.trim().replace(/['"]/g, ''));
    }
  }
  // デフォルトタグ（必要に応じてカスタマイズ）
  return [];
}

/**
 * Qiitaに記事を投稿する
 * @param filePath マークダウンファイルのパス
 * @param accessToken Qiitaのアクセストークン
 * @param isPrivate 非公開記事かどうか（デフォルト: false = 公開）
 * @param shouldTweet 投稿をツイートするかどうか（デフォルト: false）
 * @returns 投稿された記事の情報
 */
export async function publishToQiita(
  filePath: string,
  accessToken: string,
  isPrivate: boolean = false,
  shouldTweet: boolean = false
): Promise<QiitaArticleResponse> {
  try {
    // マークダウンファイルを読み込む
    const content = await readFile(filePath, 'utf-8');

    // タイトルとタグを抽出
    const title = extractTitle(content);
    const tags = extractTags(content);

    // Qiita APIリクエスト用のデータを構築
    const articleData: QiitaArticleRequest = {
      title,
      body: content,
      tags: tags.map((tag) => ({ name: tag })),
      private: isPrivate,
    };

    if (shouldTweet) {
      articleData.tweet = shouldTweet;
    }

    // Qiita APIに投稿
    const response = await axios.post<QiitaArticleResponse>(
      QIITA_API_URL,
      articleData,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log(`✅ Qiitaに投稿成功: ${response.data.url}`);
    console.log(`   タイトル: ${response.data.title}`);

    return response.data;
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      const errorData = error.response?.data;
      const errorMessage = errorData && typeof errorData === 'object' && 'message' in errorData
        ? String(errorData.message)
        : error.message;
      console.error('❌ Qiita API エラー:', errorData || error.message);
      throw new Error(
        `Qiitaへの投稿に失敗しました: ${error.response?.status} - ${errorMessage}`
      );
    }
    console.error('❌ エラー:', error);
    throw error;
  }
}
