'use client';

import { useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { SearchForm } from '@/components/search-form';
import { HeadlineStatus } from '@/components/headline-status';
import { getStationById } from '@/lib/hokkaido-data';
import { useAppInit } from '@/hooks/useAppInit';
import { saveUserReport } from '@/lib/user-reports';
import { useFavorites } from '@/hooks/useFavorites';
import { useRouteSearch } from '@/hooks/useRouteSearch';
import { FavoriteSelector } from '@/components/favorite-selector';
import { useToast } from '@/components/toast';
import { Cloud, Train, MapPin, AlertTriangle } from 'lucide-react';
import { sendGAEvent } from '@next/third-parties/google';
import { getWeatherIcon } from '@/lib/weather-utils';
import { logger } from '@/lib/logger';

// 遅延ロード: 初回表示に不要なコンポーネント
const PredictionResults = dynamic(() => import('@/components/prediction-results').then(m => ({ default: m.PredictionResults })));
const ServiceFeatures = dynamic(() => import('@/components/service-features').then(m => ({ default: m.ServiceFeatures })));
const WeatherWarningList = dynamic(() => import('@/components/weather-warning-list').then(m => ({ default: m.WeatherWarningList })));
const ProgressiveLoading = dynamic(() => import('@/components/progressive-loading').then(m => ({ default: m.ProgressiveLoading })));

export default function Home() {
  // 検索ロジックのフック
  const {
    departureStation, setDepartureStation,
    arrivalStation, setArrivalStation,
    date, setDate,
    time, setTime,

    isLoading,
    searchError, // 🆕
    prediction,
    weeklyPredictions,
    selectedRouteId,
    timeShiftSuggestion,
    riskTrend,
    realtimeStatus, // 🆕
    handleSearch,
    refreshRealtimeStatus, // 🆕
  } = useRouteSearch();



  // 初期化ロジック（天気、現在地、警報、時刻）
  const {
    weather,
    warnings,
    currentTime,
    isWeatherLoading,
    lastWeatherUpdate,
    locationName,
    userLocation,
    jrStatus // 🆕
  } = useAppInit();

  // トースト
  const { showToast } = useToast();

  // 予測結果セクションへの自動スクロール
  const predictionRef = useRef<HTMLDivElement>(null);
  const prevPrediction = useRef(prediction);

  useEffect(() => {
    // prediction が新しく設定されたときだけスクロール
    if (prediction && prediction !== prevPrediction.current) {
      prevPrediction.current = prediction;
      // レンダリング後にスクロール
      setTimeout(() => {
        predictionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [prediction]);

  // お気に入りフック
  const { favorites, addFavorite: addFav, removeFavorite, isFavorite, isLoaded: isFavoritesLoaded } = useFavorites();

  // お気に入り追加（トースト付き）
  const addFavorite = (depId: string, arrId: string, depName: string, arrName: string) => {
    addFav(depId, arrId, depName, arrName);
    showToast(`⭐ ${depName} → ${arrName} をお気に入りに追加しました`);
  };

  // ユーザー報告を保存（Supabase優先、ローカルストレージにフォールバック）
  const handleReport = async (type: 'stopped' | 'delayed' | 'crowded' | 'normal', comment?: string) => {
    if (!selectedRouteId) return;

    const reportLabels = { stopped: '運休', delayed: '遅延', crowded: '混雑', normal: '通常運行' };
    try {
      await saveUserReport({
        routeId: selectedRouteId,
        reportType: type,
        comment,
        createdAt: new Date().toISOString(),
      });

      showToast(`📝 ${reportLabels[type]}の報告を送信しました。ありがとうございます！`);
      // 自分の投稿を即座に反映させるため、データを再取得
      refreshRealtimeStatus();
    } catch (error) {
      logger.error('Report save error:', error);
      showToast('報告の送信に失敗しました', 'error');
    }
  };

  const todayWeather = weather[0];
  // Use state from hook directly (Station type via useRouteSearch)

  return (
    <main className="min-h-screen bg-[var(--background-secondary)]">
      {/* ヘッダー */}
      <header className="bg-[var(--primary)] text-white px-4 py-3 sm:py-4">
        <div className="max-w-2xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Train className="w-5 h-5" />
            <h1 className="text-[16px] font-bold">運休北海道</h1>
            <span className="text-[11px] opacity-80 ml-1">JR予報</span>
          </div>
          <div className="text-right">
            <div className="opacity-80 text-[11px]">{locationName || '北海道'}</div>
            <div className="font-bold text-[14px]">{currentTime}</div>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-4 pb-24 sm:px-6">

        {/* Headline Status (Phase 27) */}
        <HeadlineStatus
          warnings={warnings.flatMap(w => w.warnings)}
          weatherCondition={todayWeather?.weather || ''}
          jrStatus={jrStatus} // 🆕
          isLoading={isWeatherLoading}
        />

        {/* 検索フォーム — ファーストビュー直下に配置 */}
        <section className="mb-4" aria-labelledby="search-section-title">
          <h2 id="search-section-title" className="section-label">運休リスクを調べる</h2>

          {/* 🆕 お気に入りルートセレクター */}
          {isFavoritesLoaded && favorites.length > 0 && (
            <FavoriteSelector
              favorites={favorites}
              onSelect={(fav) => {
                const now = new Date();
                const year = now.getFullYear();
                const month = String(now.getMonth() + 1).padStart(2, '0');
                const day = String(now.getDate()).padStart(2, '0');
                const currentDate = `${year}-${month}-${day}`;
                const currentTime = now.toTimeString().slice(0, 5);

                // フォームの状態を更新（ユーザーリクエスト: 入力欄に反映させる）
                setDepartureStation(getStationById(fav.departureId) || null);
                setArrivalStation(getStationById(fav.arrivalId) || null);
                setDate(currentDate);
                setTime(currentTime);


                sendGAEvent('event', 'favorite_select', {
                  departure: fav.departureName,
                  arrival: fav.arrivalName
                });
                handleSearch(
                  fav.departureId,
                  fav.arrivalId,
                  currentDate,
                  currentTime
                );
              }}
            />
          )}
          <div className="card p-4">
            <SearchForm
              onSearch={handleSearch}
              isLoading={isLoading}
              departureStation={departureStation}
              setDepartureStation={setDepartureStation}
              arrivalStation={arrivalStation}
              setArrivalStation={setArrivalStation}
              date={date}
              setDate={setDate}
              time={time}
              setTime={setTime}

            />
          </div>
        </section>

        {/* 天気サマリー — 検索フォームの下に移動（セカンダリ情報） */}
        {isWeatherLoading ? (
          <section className="card p-4 mb-4 flex items-center justify-between animate-pulse min-h-[72px]">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 bg-gray-200 rounded-full" />
              <div>
                <div className="h-4 bg-gray-200 rounded w-24 mb-2" />
                <div className="h-2 bg-gray-200 rounded w-32" />
              </div>
            </div>
            <div className="w-10 h-10 bg-gray-200 rounded-lg" />
          </section>
        ) : todayWeather ? (
          <section className="card p-4 mb-4 flex items-center justify-between" aria-labelledby="weather-summary-title">
            <div className="flex items-center gap-3">
              <Cloud className="w-5 h-5 text-[var(--muted)]" aria-hidden="true" />
              <div>
                <h2 id="weather-summary-title" className="font-medium text-sm flex items-center gap-2">
                  今日の天気（{locationName.replace(/（.*?）/, '')}）
                  {userLocation && <MapPin className="w-3 h-3 text-[var(--primary)]" aria-hidden="true" />}
                </h2>
                <div className="text-xs text-[var(--muted)]">
                  {todayWeather.weather}
                  {lastWeatherUpdate && (
                    <span className="ml-2">更新: {lastWeatherUpdate}</span>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right" role="img" aria-label={`現在の天気: ${todayWeather.weather}`}>
              <div className="text-2xl" aria-hidden="true">
                {getWeatherIcon(todayWeather.weather)}
              </div>
              <div className="text-xs font-medium text-[var(--muted)]">
                {todayWeather.windSpeed >= 15 ? (
                  <span className="text-orange-500 font-bold">💨{todayWeather.windSpeed}m/s</span>
                ) : (
                  <span>{todayWeather.tempMax}°/{todayWeather.tempMin}°</span>
                )}
              </div>
            </div>
          </section>
        ) : null}

        {/* 全道の警報表示 (折りたたみコンポーネント) */}
        <WeatherWarningList warnings={warnings} isLoading={isWeatherLoading} />



        {/* Progressive Loading (Phase 27) */}
        {isLoading && <ProgressiveLoading isLoading={isLoading} />}

        {/* P1-4: エラー表示 */}
        {searchError && (
          <div className="card p-4 mb-4 border-2 border-red-200 bg-red-50">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm text-red-800">予測エラー</p>
                <p className="text-xs text-red-700 mt-1">{searchError}</p>
                <p className="text-[11px] text-red-600 mt-2">
                  直接確認:
                  <a href="https://www3.jrhokkaido.co.jp/webunkou/" target="_blank" rel="noopener noreferrer"
                    className="underline hover:opacity-80 ml-1 font-medium">JR北海道公式運行情報</a>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 予測結果セクション */}
        {prediction && (
          <div ref={predictionRef}>
            <PredictionResults
              prediction={prediction}
              selectedRouteId={selectedRouteId}
              date={date}
              time={time}
              depStation={departureStation}
              arrStation={arrivalStation}
              riskTrend={riskTrend}
              realtimeStatus={realtimeStatus}
              timeShiftSuggestion={timeShiftSuggestion}
              weeklyPredictions={weeklyPredictions}
              weather={weather}
              handleReport={handleReport}
              isFavorite={isFavorite}
              addFavorite={addFavorite}
              removeFavorite={removeFavorite}
            />
          </div>
        )}

        {/* Pro誘導バナー - 後で機能追加予定（現在非公開）
        <div className="mt-8 card p-5 text-center border-[var(--primary)] border-2">
          <h3 className="text-base font-bold text-[var(--primary)] mb-2">🚀 Proプランで先読み</h3>
          <p className="text-sm text-[var(--muted)] mb-4">
            公式発表の30分前にプッシュ通知。<br />
            24時間先までの詳細予測グラフも。
          </p>
          <button className="btn-primary py-2.5 px-6 text-sm">
            7日間無料で試す
          </button>
        </div>
        */}

        {/* サービス特徴・価値提案 */}
        <ServiceFeatures />

        {/* フッター */}
      </div>
    </main>
  );
}
