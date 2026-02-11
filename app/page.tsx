'use client';

import { useState, useEffect } from 'react';
import { SearchForm } from '@/components/search-form';
import { PredictionResultCard } from '@/components/prediction-result';
import { ReportButtons } from '@/components/report-buttons';
import { AlternativeRoutes } from '@/components/alternative-routes';
import { DonationButton } from "@/components/donation-button";
import { WeeklyForecastChart } from '@/components/weekly-forecast';
import { ShareCard } from '@/components/share-card';
import { WeatherWarningList } from '@/components/weather-warning-list'; // 🆕
import { HourlyRiskChart } from '@/components/hourly-risk-chart'; // 🆕
import { ProgressiveLoading } from '@/components/progressive-loading'; // 🆕 Phase 27
import { HeadlineStatus } from '@/components/headline-status'; // 🆕 Phase 27
import { getRouteById, getStationById, getCommonLines, getJRStatusUrl, Station } from '@/lib/hokkaido-data';
// unused imports removed
import { useAppInit } from '@/hooks/useAppInit'; // 🆕
import { findTrain } from '@/lib/timetable-data'; // 🆕
import { JROperationStatus } from '@/lib/jr-status';
import { saveUserReport, aggregateCrowdsourcedStatus } from '@/lib/user-reports';
import { PredictionResult, WeatherForecast, WeatherWarning, HourlyRiskData } from '@/lib/types';
import { useFavorites } from '@/hooks/useFavorites';
import { useRouteSearch } from '@/hooks/useRouteSearch';
import { FavoriteSelector } from '@/components/favorite-selector';
import { Cloud, AlertTriangle, Train, ArrowRight, RefreshCw, Radio, ExternalLink, ChevronRight, MapPin, Star } from 'lucide-react';

import { getWeatherIcon } from '@/lib/weather-utils';

export default function Home() {
  // 検索ロジックのフック
  const {
    departureStation, setDepartureStation,
    arrivalStation, setArrivalStation,
    date, setDate,
    time, setTime,
    timeType, setTimeType,
    isLoading,
    prediction,
    weeklyPredictions,
    selectedRouteId,
    timeShiftSuggestion,
    riskTrend,
    realtimeStatus, // 🆕
    handleSearch,
    refreshRealtimeStatus // 🆕
  } = useRouteSearch();

  // 初期化ロジック（天気、現在地、警報、時刻）
  const {
    weather,
    warnings,
    currentTime,
    isWeatherLoading,
    lastWeatherUpdate,
    locationName,
    userLocation
  } = useAppInit();



  // お気に入りフック
  const { favorites, addFavorite, removeFavorite, isFavorite, isLoaded: isFavoritesLoaded } = useFavorites();

  // ユーザー報告を保存（Supabase優先、ローカルストレージにフォールバック）
  const handleReport = async (type: 'stopped' | 'delayed' | 'crowded' | 'normal', comment?: string) => {
    if (!selectedRouteId) return;

    try {
      await saveUserReport({
        routeId: selectedRouteId,
        reportType: type,
        comment,
        createdAt: new Date().toISOString(),
      });

      // 自分の投稿を即座に反映させるため、データを再取得
      refreshRealtimeStatus();

      // 必要なら全体再検索も（念のため非同期で）
      /*
      if (departureStation && arrivalStation) {
        handleSearch(
          departureStation.id,
          arrivalStation.id,
          date,
          time,
          timeType
        );
      }
      */
    } catch (error) {
      console.error('Report save error:', error);
    }
  };

  const todayWeather = weather[0];
  // const depStation = departureStationId ? getStationById(departureStationId) : null;
  // const arrStation = arrivalStationId ? getStationById(arrivalStationId) : null;
  // Use state from hook directly
  const depStation = departureStation;
  const arrStation = arrivalStation;

  return (
    <main className="min-h-screen bg-[var(--background-secondary)]">
      {/* ヘッダー */}
      <header className="bg-[var(--primary)] text-white px-4 py-3">
        <div className="max-w-lg mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Train className="w-5 h-5" />
            <h1 className="text-xl font-bold">運休北海道</h1>
            <span className="text-[10px] opacity-80 ml-1">JR予報</span>
          </div>
          <div className="text-right text-sm">
            <div className="opacity-80 text-[10px]">札幌</div>
            <div className="font-bold text-base">{currentTime}</div>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-4 pb-24 md:px-6">

        {/* Headline Status (Phase 27) */}
        {todayWeather && (
          <HeadlineStatus
            warnings={warnings.flatMap(w => w.warnings)}
            weatherCondition={todayWeather.weather}
          />
        )}

        {/* 天気サマリー */}
        {todayWeather && (
          <section className="card p-3 mb-4 flex items-center justify-between" aria-labelledby="weather-summary-title">
            <div className="flex items-center gap-3">
              <Cloud className="w-5 h-5 text-[var(--muted)]" aria-hidden="true" />
              <div>
                <h2 id="weather-summary-title" className="font-medium text-sm flex items-center gap-2">
                  今日の天気（{locationName}）
                  {userLocation && <MapPin className="w-3 h-3 text-[var(--primary)]" aria-hidden="true" />}
                  {isWeatherLoading && (
                    <RefreshCw className="w-3 h-3 animate-spin text-[var(--muted)]" aria-hidden="true" />
                  )}
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
              <div className="text-[10px] font-medium text-[var(--muted)]">
                {todayWeather.windSpeed >= 15 ? (
                  <span className="text-orange-500 font-bold">💨{todayWeather.windSpeed}m/s</span>
                ) : (
                  <span>{todayWeather.tempMax}°/{todayWeather.tempMin}°</span>
                )}
              </div>
            </div>
          </section>
        )}

        {/* 全道の警報表示 (折りたたみコンポーネント) */}
        <WeatherWarningList warnings={warnings} />

        {/* 検索フォーム */}
        <section className="mb-6" aria-labelledby="search-section-title">
          <h2 id="search-section-title" className="section-label">運休リスクを調べる</h2>


          {/* 🆕 お気に入りルートセレクター */}
          {isFavoritesLoaded && favorites.length > 0 && (
            <FavoriteSelector
              favorites={favorites}
              onSelect={(fav) => {
                const now = new Date();
                const currentDate = now.toISOString().split('T')[0];
                const currentTime = now.toTimeString().slice(0, 5);

                // フォームの状態を更新（ユーザーリクエスト: 入力欄に反映させる）
                setDepartureStation(getStationById(fav.departureId) || null);
                setArrivalStation(getStationById(fav.arrivalId) || null);
                setDate(currentDate);
                setTime(currentTime);
                setTimeType('departure');

                // setIsLoading(true); // Hook handles this
                handleSearch(
                  fav.departureId,
                  fav.arrivalId,
                  currentDate,
                  currentTime,
                  'departure'
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
              timeType={timeType}
              setTimeType={setTimeType}
            />
          </div>
        </section>

        {/* Progressive Loading (Phase 27) */}
        {isLoading && <ProgressiveLoading isLoading={isLoading} />}

        {/* 予測結果 */}
        {prediction && selectedRouteId && (
          <section className="space-y-3" aria-labelledby="result-section-title">
            <h2 id="result-section-title" className="section-label">予測結果</h2>

            {/* 区間表示 & お気に入り登録 */}
            {depStation && arrStation && (
              <div className="card p-3 flex items-center justify-between gap-3 font-medium">
                {/* 左側：区間名 */}
                <div className="flex items-center gap-3 pl-1">
                  <span>{depStation.name}</span>
                  <ArrowRight className="w-4 h-4 text-[var(--muted)]" />
                  <span>{arrStation.name}</span>
                </div>

                {/* 右側：お気に入りボタン（ラベル付き） */}
                <button
                  onClick={() => {
                    if (isFavorite(depStation.id, arrStation.id)) {
                      const id = `${depStation.id}-${arrStation.id}`;
                      removeFavorite(id);
                    } else {
                      addFavorite(depStation.id, arrStation.id, depStation.name, arrStation.name);
                    }
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all shadow-sm ${isFavorite(depStation.id, arrStation.id)
                    ? 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                    : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
                    }`}
                  aria-label={isFavorite(depStation.id, arrStation.id) ? "お気に入りから削除" : "お気に入りに追加"}
                >
                  {isFavorite(depStation.id, arrStation.id) ? (
                    <>
                      <Star className="w-3.5 h-3.5 fill-yellow-500 text-yellow-500" role="presentation" />
                      登録済み
                    </>
                  ) : (
                    <>
                      <Star className="w-3.5 h-3.5" role="presentation" />
                      登録
                    </>
                  )}
                </button>
              </div>
            )}

            <PredictionResultCard
              result={prediction}
              route={getRouteById(selectedRouteId)!}
              targetDate={date}
            />

            {/* SNSシェア (重要度が高いため、結果のすぐ下に移動) */}
            {depStation && arrStation && (
              <ShareCard
                prediction={prediction}
                routeName={getRouteById(selectedRouteId)?.name || ''}
                departureStation={depStation.name}
                arrivalStation={arrStation.name}
              />
            )}

            {/* 時間帯別リスク推移 (追加) */}
            {riskTrend && riskTrend.length > 0 && (
              <HourlyRiskChart data={riskTrend} />
            )}

            {/* 状況報告 */}
            <ReportButtons
              routeId={selectedRouteId}
              routeName={getRouteById(selectedRouteId)?.name || ''}
              onReport={handleReport}
              counts={realtimeStatus?.last15minCounts ? {
                stopped: realtimeStatus.last15minCounts.stopped,
                delayed: realtimeStatus.last15minCounts.delayed, // 🆕
                crowded: realtimeStatus.last15minCounts.crowded, // 🆕
                resumed: realtimeStatus.last15minCounts.resumed
              } : undefined}
            />

            {/* 代替ルート提案 */}
            {prediction.probability >= 30 && (
              <AlternativeRoutes
                originalRoute={getRouteById(selectedRouteId)!}
                predictionResult={prediction}
                departureStation={depStation || undefined}
                arrivalStation={arrStation || undefined}
                timeShiftSuggestion={timeShiftSuggestion}
                futureRisks={riskTrend} // 🆕 未来のリスク推移を渡す
                onSelect={(selection) => {
                  // console.log('Alternative selected:', selection);
                }}
              />
            )}





            {/* 週間予測グラフ */}
            {weeklyPredictions.length > 0 && (
              <WeeklyForecastChart
                predictions={weeklyPredictions}
                weather={weather}
              />
            )}




          </section>
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

        {/* フッター */}
        <footer className="mt-8 text-center pb-8 border-t border-[var(--border)] pt-8">
          <p className="text-[10px] text-[var(--muted)] mb-4">
            ※本サービスは予測に基づく参考情報です。<br />
            実際の運行状況は必ずJR北海道公式サイトをご確認ください。
          </p>

          {/* Donation Button (Dev Only) */}
          {process.env.NODE_ENV === 'development' && (
            <DonationButton />
          )}

          <div className="mt-8 text-[10px] text-[var(--muted)] opacity-70 space-y-2">
            <div>
              <p>運営: 株式会社アンドアール</p>
              <a href="mailto:info@andr.ltd" className="hover:text-[var(--primary)] transition-colors">
                お問い合わせ: info@andr.ltd
              </a>
            </div>
            <div>
              <p className="mb-0.5">天気データ: Open-Meteo API</p>
              <p>&copy; 2026 運休北海道 - Unkyu Hokkaido AI</p>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}
