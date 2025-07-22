// Content script for Quick VRT Extension (TypeScript version)

class QuickVRTContent {
  private originalScrollBehavior: string | null = null;
  private originalBodyStyles: { [key: string]: string } = {};
  private originalHtmlStyles: { [key: string]: string } = {};

  constructor() {
    this.init();
  }

  private init(): void {
    this.setupMessageListener();
  }

  private setupMessageListener(): void {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // 非同期レスポンスを有効にする
    });
  }

  private async handleMessage(message: any, sender: any, sendResponse: (response: any) => void): Promise<void> {
    try {
      switch (message.type) {
        case 'PREPARE_FOR_CAPTURE':
          await this.prepareForCapture(message.options);
          sendResponse({ success: true });
          break;

        case 'SCROLL_TO_TOP':
          this.scrollToTop();
          sendResponse({ success: true });
          break;

        case 'SCROLL_TO_POSITION':
          this.scrollToPosition(message.y);
          sendResponse({ success: true });
          break;

        case 'SCROLL_TO_BOTTOM':
          await this.scrollToBottom();
          sendResponse({ success: true });
          break;

        case 'GET_PAGE_INFO':
          const pageInfo = this.getPageInfo();
          sendResponse({ success: true, data: pageInfo });
          break;

        case 'DISABLE_ANIMATIONS':
          this.disableAnimations();
          sendResponse({ success: true });
          break;

        case 'RESTORE_PAGE':
          this.restorePage();
          sendResponse({ success: true });
          break;

        case 'CAPTURE_FULL_PAGE':
          const captureData = await this.prepareFullPageCapture(message.options);
          sendResponse({ success: true, data: captureData });
          break;

        case 'CAPTURE_WITH_VIEWPORT_RESIZE':
          const resizeData = await this.prepareViewportResize(message.options);
          sendResponse({ success: true, data: resizeData });
          break;

        case 'RESTORE_VIEWPORT':
          await this.restoreViewport(message.originalSize);
          sendResponse({ success: true });
          break;

        case 'APPLY_FULLPAGE_STYLES':
          this.applyFullPageStyles();
          sendResponse({ success: true });
          break;

        default:
          sendResponse({ success: false, error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('Content script メッセージ処理エラー:', error);
      sendResponse({ success: false, error: (error as Error).message });
    }
  }

  // キャプチャの準備
  private async prepareForCapture(options: any = {}): Promise<void> {
    try {
      // ページの安定化のための処理
      if (options.disableAnimations) {
        this.disableAnimations();
      }

      // スクロール処理
      if (options.autoScroll) {
        await this.performFullPageScroll();
      } else {
        // 基本的には最上部にスクロール
        this.scrollToTop();
      }

      // 画像の読み込み待機
      if (options.waitForImages) {
        await this.waitForImages();
      }

      // 追加の安定化待機
      const delay = options.stabilizationDelay || 500;
      await new Promise(resolve => setTimeout(resolve, delay));

    } catch (error) {
      console.error('キャプチャ準備エラー:', error);
      throw error;
    }
  }

  // ページ情報の取得
  private getPageInfo(): any {
    return {
      url: window.location.href,
      title: document.title,
      scrollHeight: document.documentElement.scrollHeight,
      scrollWidth: document.documentElement.scrollWidth,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      hasLazyImages: this.hasLazyLoadingImages(),
      hasAnimations: this.hasAnimations()
    };
  }

  // 最上部へのスクロール
  private scrollToTop(): void {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }

  // 最下部への段階的スクロール
  private async scrollToBottom(delay: number = 300): Promise<void> {
    const scrollHeight = document.documentElement.scrollHeight;
    const viewportHeight = window.innerHeight;
    let currentPosition = 0;

    while (currentPosition < scrollHeight) {
      currentPosition += viewportHeight;
      window.scrollTo({ top: currentPosition, behavior: 'auto' });
      
      // 各スクロール後に遅延
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // 新しいコンテンツが読み込まれた場合の対応
      const newScrollHeight = document.documentElement.scrollHeight;
      if (newScrollHeight > scrollHeight) {
        break; // 無限スクロールなどの場合
      }
    }

    // 最終的に最上部に戻る
    this.scrollToTop();
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  // フルページスクロール（lazy loading対応）
  private async performFullPageScroll(): Promise<void> {
    try {
      const initialHeight = document.documentElement.scrollHeight;
      
      // 段階的にスクロールして lazy loading をトリガー
      await this.scrollToBottom(200);
      
      // lazy loading画像の読み込み待機
      await this.triggerLazyLoading();
      
      // 最終的に最上部に戻す
      this.scrollToTop();
      await new Promise(resolve => setTimeout(resolve, 300));
      
    } catch (error) {
      console.error('フルページスクロールエラー:', error);
      this.scrollToTop(); // エラー時も最上部に戻す
    }
  }

  // Lazy loading のトリガー
  private async triggerLazyLoading(): Promise<void> {
    // 一般的なlazy loadingのセレクタ
    const lazySelectors = [
      'img[data-src]',
      'img[data-srcset]',
      'img[loading="lazy"]',
      'picture[data-src]',
      'source[data-srcset]',
      '[data-bg]',
      '[data-background]',
      '[data-background-image]',
      '.lazy',
      '.lazyload',
      '.lazy-load'
    ];

    // lazy loading要素を強制的に読み込み
    lazySelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        const element = el as HTMLElement;
        const imgElement = el as HTMLImageElement;
        
        // data-src を src に移動
        if (element.dataset.src && !imgElement.src) {
          imgElement.src = element.dataset.src;
        }
        if (element.dataset.srcset && !imgElement.srcset) {
          imgElement.srcset = element.dataset.srcset;
        }
        // loading属性を変更
        if (imgElement.loading === 'lazy') {
          imgElement.loading = 'eager';
        }
        // backgroundImageの処理
        const bgSrc = element.dataset.bg || element.dataset.background || element.dataset.backgroundImage;
        if (bgSrc) {
          element.style.backgroundImage = `url(${bgSrc})`;
        }
      });
    });

    // Intersection Observer APIを使用しているlazy loadingの場合
    // 全ての要素を一度ビューポートに入れる
    const lazyElements = document.querySelectorAll(lazySelectors.join(','));
    lazyElements.forEach(element => {
      // 要素を一時的に表示領域に入れる
      element.scrollIntoView({ behavior: 'auto', block: 'center' });
    });

    // 画像読み込みを待機
    await this.waitForImages(3000); // 3秒でタイムアウト
  }

  // 画像読み込みの待機
  private async waitForImages(timeout: number = 5000): Promise<void> {
    const images = Array.from(document.images).filter(img => !img.complete);
    
    if (images.length === 0) {
      return; // すべての画像が読み込み済み
    }

    return new Promise((resolve) => {
      let loadedCount = 0;
      const totalImages = images.length;
      const timeoutId = setTimeout(resolve, timeout);

      const onImageLoad = () => {
        loadedCount++;
        if (loadedCount >= totalImages) {
          clearTimeout(timeoutId);
          resolve();
        }
      };

      images.forEach(img => {
        if (img.complete) {
          onImageLoad();
        } else {
          img.addEventListener('load', onImageLoad, { once: true });
          img.addEventListener('error', onImageLoad, { once: true });
        }
      });
    });
  }

  // アニメーションの無効化
  private disableAnimations(): void {
    // CSS animationsとtransitionsを無効化
    const style = document.createElement('style');
    style.id = 'quick-vrt-disable-animations';
    style.innerHTML = `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
        transition-property: none !important;
      }
      
      /* 一般的なアニメーションライブラリのクラスを無効化 */
      .animate__animated,
      .animated,
      [class*="animate-"],
      [class*="fade"],
      [class*="slide"],
      [class*="bounce"],
      [class*="zoom"],
      [class*="rotate"],
      [class*="flip"] {
        animation: none !important;
        transition: none !important;
      }
    `;
    
    document.head.appendChild(style);

    // JavaScript animationsの無効化
    this.disableJavaScriptAnimations();
    
    // スムーススクロールの無効化
    this.originalScrollBehavior = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = 'auto';
  }

  // JavaScriptアニメーションの無効化
  private disableJavaScriptAnimations(): void {
    // requestAnimationFrame を即座に実行するように変更
    const originalRAF = window.requestAnimationFrame;
    window.requestAnimationFrame = function(callback: FrameRequestCallback): number {
      return setTimeout(callback, 0);
    };

    // setTimeout/setInterval の短い遅延を0に変更
    const originalSetTimeout = window.setTimeout;
    window.setTimeout = function(callback: (...args: any[]) => void, delay?: number, ...args: any[]): number {
      const newDelay = (delay && delay < 100) ? 0 : delay;
      return originalSetTimeout(callback, newDelay, ...args);
    };

    // 一般的なアニメーションライブラリを無効化
    this.disableAnimationLibraries();
  }

  // アニメーションライブラリの無効化
  private disableAnimationLibraries(): void {
    // jQuery animations
    const $ = (window as any).jQuery || (window as any).$;
    if ($) {
      if ($.fx) {
        $.fx.off = true;
      }
    }

    // GSAP
    const gsap = (window as any).gsap;
    if (gsap) {
      try {
        gsap.globalTimeline.pause();
      } catch (e) {
        console.warn('GSAP制御エラー:', e);
      }
    }

    // Anime.js
    const anime = (window as any).anime;
    if (anime && anime.running) {
      try {
        anime.running.forEach((anim: any) => anim.pause());
      } catch (e) {
        console.warn('Anime.js制御エラー:', e);
      }
    }

    // Velocity.js
    const Velocity = (window as any).Velocity;
    if (Velocity) {
      try {
        Velocity.mock = true;
      } catch (e) {
        console.warn('Velocity.js制御エラー:', e);
      }
    }
  }

  // ページの復元
  private restorePage(): void {
    // アニメーション無効化スタイルの削除
    const style = document.getElementById('quick-vrt-disable-animations');
    if (style) {
      style.remove();
    }

    // スクロール動作の復元
    if (this.originalScrollBehavior !== null) {
      document.documentElement.style.scrollBehavior = this.originalScrollBehavior;
    }

    // 最上部にスクロール
    this.scrollToTop();
  }

  // lazy loading画像の存在チェック
  private hasLazyLoadingImages(): boolean {
    const lazySelectors = [
      'img[data-src]',
      'img[data-srcset]',
      'img[loading="lazy"]',
      '.lazy',
      '.lazyload'
    ];
    
    return lazySelectors.some(selector => 
      document.querySelector(selector) !== null
    );
  }

  // アニメーションの存在チェック
  private hasAnimations(): boolean {
    // CSS animationsのチェック
    const animatedElements = document.querySelectorAll('[class*="animate"], [class*="animation"], .animated');
    if (animatedElements.length > 0) {
      return true;
    }

    // CSS transitions/animations の計算スタイルをチェック
    const elements = document.querySelectorAll('*');
    for (let i = 0; i < Math.min(elements.length, 50); i++) { // パフォーマンス考慮で最初の50要素のみ
      const computedStyle = window.getComputedStyle(elements[i]);
      if (computedStyle.animationDuration !== '0s' || 
          computedStyle.transitionDuration !== '0s') {
        return true;
      }
    }

    return false;
  }

  // ページの安定性チェック
  private async waitForPageStability(timeout: number = 3000): Promise<void> {
    return new Promise((resolve) => {
      let stabilityTimer: number;
      let lastHeight = document.documentElement.scrollHeight;
      let stableCount = 0;
      const requiredStableCount = 5; // 5回連続で変化なしなら安定とみなす

      const checkStability = () => {
        const currentHeight = document.documentElement.scrollHeight;
        if (currentHeight === lastHeight) {
          stableCount++;
          if (stableCount >= requiredStableCount) {
            clearInterval(stabilityTimer);
            resolve();
          }
        } else {
          stableCount = 0;
          lastHeight = currentHeight;
        }
      };

      stabilityTimer = setInterval(checkStability, 200) as unknown as number;
      
      // タイムアウト処理
      setTimeout(() => {
        clearInterval(stabilityTimer);
        resolve();
      }, timeout);
    });
  }

  // フルページキャプチャの準備
  private async prepareFullPageCapture(options: any = {}): Promise<any> {
    try {
      // アニメーション無効化
      if (options.disableAnimations !== false) {
        this.disableAnimations();
      }

      // ページ全体をスクロールしてlazy loadingをトリガー
      if (options.triggerLazyLoading !== false) {
        await this.performFullPageScroll();
      }

      // ページ情報を取得
      const pageInfo = this.getPageInfo();

      // キャプチャのための分割情報を計算
      const captureInfo = this.calculateCaptureRegions(pageInfo);

      return {
        pageInfo,
        captureInfo,
        viewportHeight: window.innerHeight,
        totalHeight: document.documentElement.scrollHeight,
        totalWidth: document.documentElement.scrollWidth
      };
    } catch (error) {
      console.error('フルページキャプチャ準備エラー:', error);
      throw error;
    }
  }

  // キャプチャ領域の計算
  private calculateCaptureRegions(pageInfo: any): any {
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const totalHeight = pageInfo.scrollHeight;
    const totalWidth = pageInfo.scrollWidth;

    const regions = [];
    let currentY = 0;

    // 垂直方向に分割
    while (currentY < totalHeight) {
      const remainingHeight = totalHeight - currentY;
      const captureHeight = Math.min(viewportHeight, remainingHeight);
      
      regions.push({
        x: 0,
        y: currentY,
        width: viewportWidth,
        height: captureHeight,
        scrollTop: currentY,
        isLastRegion: currentY + captureHeight >= totalHeight
      });

      currentY += captureHeight;
    }

    return {
      regions,
      totalRegions: regions.length,
      viewportSize: { width: viewportWidth, height: viewportHeight },
      fullSize: { width: totalWidth, height: totalHeight }
    };
  }

  // 指定位置にスクロール
  public scrollToPosition(y: number): void {
    window.scrollTo({ top: y, left: 0, behavior: 'auto' });
  }

  // ビューポートリサイズ準備
  private async prepareViewportResize(options: any = {}): Promise<any> {
    try {
      // アニメーション無効化
      if (options.disableAnimations !== false) {
        this.disableAnimations();
      }

      // ページ全体をスクロールしてlazy loadingをトリガー
      if (options.triggerLazyLoading !== false) {
        await this.performFullPageScroll();
      }

      // 最上部に戻す
      this.scrollToTop();

      // ページ情報を取得
      const pageInfo = this.getPageInfo();

      return {
        pageInfo,
        currentViewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        requiredSize: {
          width: pageInfo.scrollWidth,
          height: pageInfo.scrollHeight
        }
      };
    } catch (error) {
      console.error('ビューポートリサイズ準備エラー:', error);
      throw error;
    }
  }

  // フルページスタイルの適用
  private applyFullPageStyles(): void {
    try {
      const body = document.body;
      const html = document.documentElement;

      // 現在のスタイルを保存
      this.saveOriginalStyles();

      // ページ全体が表示されるようにスタイルを調整
      const fullPageStyles = {
        position: 'static',
        width: 'auto',
        height: 'auto',
        maxWidth: 'none',
        maxHeight: 'none',
        overflow: 'visible',
        transform: 'none',
        margin: '0',
        padding: '0'
      };

      // bodyにスタイル適用
      Object.assign(body.style, fullPageStyles);

      // htmlにスタイル適用
      Object.assign(html.style, {
        ...fullPageStyles,
        minHeight: 'auto'
      });

      // 固定要素を調整
      this.adjustFixedElements();

      console.log('フルページスタイルを適用しました');
    } catch (error) {
      console.error('フルページスタイル適用エラー:', error);
    }
  }

  // 元のスタイルを保存
  private saveOriginalStyles(): void {
    const body = document.body;
    const html = document.documentElement;

    const styleProps = ['position', 'width', 'height', 'maxWidth', 'maxHeight', 'overflow', 'transform', 'margin', 'padding', 'minHeight'];

    this.originalBodyStyles = {};
    this.originalHtmlStyles = {};

    styleProps.forEach(prop => {
      this.originalBodyStyles[prop] = body.style[prop as any] || '';
      this.originalHtmlStyles[prop] = html.style[prop as any] || '';
    });
  }

  // 固定要素の調整
  private adjustFixedElements(): void {
    const fixedElements = document.querySelectorAll('[style*="position: fixed"], [style*="position:fixed"]');
    fixedElements.forEach((element: Element) => {
      const el = element as HTMLElement;
      el.style.position = 'absolute';
    });

    // CSSで固定されている要素も調整
    const computedFixedElements = Array.from(document.querySelectorAll('*')).filter(el => {
      const computed = window.getComputedStyle(el);
      return computed.position === 'fixed';
    });

    computedFixedElements.forEach((element: Element) => {
      const el = element as HTMLElement;
      el.style.position = 'absolute';
    });
  }

  // ビューポートの復元
  private async restoreViewport(originalSize: any): Promise<void> {
    try {
      // スタイルを元に戻す
      this.restoreOriginalStyles();

      // ページの復元
      this.restorePage();
      
      // 最上部にスクロール
      this.scrollToTop();

      console.log('ビューポートを復元しました');
    } catch (error) {
      console.error('ビューポート復元エラー:', error);
    }
  }

  // 元のスタイルを復元
  private restoreOriginalStyles(): void {
    try {
      const body = document.body;
      const html = document.documentElement;

      // bodyのスタイルを復元
      Object.keys(this.originalBodyStyles).forEach(prop => {
        body.style[prop as any] = this.originalBodyStyles[prop];
      });

      // htmlのスタイルを復元
      Object.keys(this.originalHtmlStyles).forEach(prop => {
        html.style[prop as any] = this.originalHtmlStyles[prop];
      });

      // 固定要素を元に戻す（簡単な方法として、ページをリロードではなく、CSSを戻す）
      this.restoreFixedElements();

    } catch (error) {
      console.error('元のスタイル復元エラー:', error);
    }
  }

  // 固定要素を元に戻す
  private restoreFixedElements(): void {
    // 手動で変更した要素を戻す
    const modifiedElements = document.querySelectorAll('[style*="position: absolute"]');
    modifiedElements.forEach((element: Element) => {
      const el = element as HTMLElement;
      // 元々fixedだった可能性があるが、判別が難しいので、ページ復元で対応
    });
  }
}

// Content scriptの初期化
if (typeof window !== 'undefined') {
  new QuickVRTContent();
}