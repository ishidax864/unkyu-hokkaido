'use client';

import { useState, useEffect } from 'react';
import { SearchForm } from '@/components/search-form';
import { PredictionResultCard } from '@/components/prediction-result';
import { ReportButtons } from '@/components/report-buttons';
import { AlternativeRoutes } from '@/components/alternative-routes';
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

// 天気アイコン取得（簡易版）
function getWeatherIcon(weather: string): string {
  if (weather.includes('雪')) return '❄️';
  if (weather.includes('雨')) return '🌧️';
  if (weather.includes('曇')) return '☁️';
  return '☀️';
}

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
            <h1 className="text-lg font-bold">運休北海道</h1>
            <span className="text-xs opacity-80 ml-1">JR予報</span>
          </div>
          <div className="text-right text-sm">
            <div className="opacity-80 text-xs">札幌</div>
            <div className="font-semibold">{currentTime}</div>
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
          <div className="card p-3 mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Cloud className="w-5 h-5 text-[var(--muted)]" />
              <div>
                <div className="font-medium text-sm flex items-center gap-2">
                  今日の天気（{locationName}）
                  {userLocation && <MapPin className="w-3 h-3 text-[var(--primary)]" />}
                  {isWeatherLoading && (
                    <RefreshCw className="w-3 h-3 animate-spin text-[var(--muted)]" />
                  )}
                </div>
                <div className="text-xs text-[var(--muted)]">
                  {todayWeather.weather}
                  {lastWeatherUpdate && (
                    <span className="ml-2">更新: {lastWeatherUpdate}</span>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xl">
                {todayWeather.weather.includes('雪') ? '❄️' :
                  todayWeather.weather.includes('雨') ? '🌧️' :
                    todayWeather.weather.includes('曇') ? '☁️' : '☀️'}
              </div>
              <div className="text-xs text-[var(--muted)]">
                {todayWeather.windSpeed >= 15 ? (
                  <span className="text-orange-500">💨{todayWeather.windSpeed}m/s</span>
                ) : (
                  <span>{todayWeather.tempMax}°/{todayWeather.tempMin}°</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 全道の警報表示 (折りたたみコンポーネント) */}
        <WeatherWarningList warnings={warnings} />

        {/* 検索フォーム */}
        <section className="mb-6">
          <div className="section-label">運休リスクを調べる</div>


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
          <section className="space-y-3">
            <div className="section-label">予測結果</div>

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
                >
                  {isFavorite(depStation.id, arrStation.id) ? (
                    <>
                      <Star className="w-3.5 h-3.5 fill-yellow-500 text-yellow-500" />
                      登録済み
                    </>
                  ) : (
                    <>
                      <Star className="w-3.5 h-3.5" />
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

            {/* 状況報告（代替ルートの前へ移動） */}
            <ReportButtons
              routeId={selectedRouteId}
              routeName={getRouteById(selectedRouteId)?.name || ''}
              onReport={handleReport}
              counts={realtimeStatus?.last30minCounts ? {
                stopped: realtimeStatus.last30minCounts.stopped,
                delayed: realtimeStatus.last30minCounts.delayed, // 🆕
                crowded: realtimeStatus.last30minCounts.crowded, // 🆕
                resumed: realtimeStatus.last30minCounts.resumed
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
                  console.log('Alternative selected:', selection);
                }}
              />
            )}

            {/* 時間帯別リスクグラフ */}
            {riskTrend.length > 0 && prediction.probability >= 30 && (
              <HourlyRiskChart data={riskTrend} />
            )}

            {/* SNSシェア */}
            {depStation && arrStation && (
              <ShareCard
                prediction={prediction}
                routeName={getRouteById(selectedRouteId)?.name || ''}
                departureStation={depStation.name}
                arrivalStation={arrStation.name}
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
        <footer className="mt-8 text-center text-xs text-[var(--muted)]">
          <p>© 2026 運休北海道 - 予測は参考情報です。最新情報はJR北海道の公式発表をご確認ください。</p>
          <p className="mt-1 text-[10px]">天気データ: Open-Meteo API</p>
        </footer>
      </div>
    </main>
  );
}
