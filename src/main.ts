import { readdir, stat } from 'fs/promises';
import { join } from 'path';
import { publishToQiita } from './apis/qiita.js';

const ARTICLES_DIR = join(process.cwd(), 'articles');

/**
 * articlesフォルダ内のすべてのマークダウンファイルを取得
 */
async function getMarkdownFiles(dirPath: string): Promise<string[]> {
  const files = await readdir(dirPath);
  const mdFiles: string[] = [];

  for (const file of files) {
    const filePath = join(dirPath, file);
    const fileStat = await stat(filePath);

    if (fileStat.isFile() && file.endsWith('.md')) {
      mdFiles.push(filePath);
    }
  }

  return mdFiles;
}

/**
 * メイン処理
 */
async function main() {
  try {
    // 環境変数からQiitaアクセストークンを取得
    const qiitaAccessToken = process.env.QIITA_ACCESS_TOKEN;

    if (!qiitaAccessToken) {
      throw new Error(
        'QIITA_ACCESS_TOKEN環境変数が設定されていません。' +
        'Qiitaのアクセストークンを設定してください。'
      );
    }

    console.log('📝 articlesフォルダからマークダウンファイルを検索中...');
    const mdFiles = await getMarkdownFiles(ARTICLES_DIR);

    if (mdFiles.length === 0) {
      console.log('⚠️  マークダウンファイルが見つかりませんでした。');
      return;
    }

    console.log(`📄 ${mdFiles.length}件のマークダウンファイルが見つかりました。\n`);

    // 各ファイルをQiitaに投稿
    for (const filePath of mdFiles) {
      console.log(`📤 投稿中: ${filePath}`);
      try {
        await publishToQiita(filePath, qiitaAccessToken, false, false);
        console.log('');
      } catch (error) {
        console.error(`❌ 投稿失敗: ${filePath}`);
        console.error(error);
        console.log('');
      }
    }

    console.log('✅ すべての処理が完了しました。');
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  }
}

main();
