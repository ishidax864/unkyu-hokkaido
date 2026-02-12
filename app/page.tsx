'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { SearchForm } from '@/components/search-form';
import { ServiceFeatures } from '@/components/service-features';
import { PredictionResults } from '@/components/prediction-results';
import { WeatherWarningList } from '@/components/weather-warning-list';
import { ProgressiveLoading } from '@/components/progressive-loading';
import { HeadlineStatus } from '@/components/headline-status';
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
import { sendGAEvent } from '@next/third-parties/google'; // 🆕

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
    refreshRealtimeStatus, // 🆕
  } = useRouteSearch();

  const handleRefresh = () => {
    sendGAEvent('event', 'refresh_status', { route: selectedRouteId });
    refreshRealtimeStatus();
  };

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
                    <RefreshCw className="w-3 h-3 animate-spin text-[var(--muted)]" aria-hidden="true" onClick={handleRefresh} />
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
                sendGAEvent('event', 'favorite_select', {
                  departure: fav.departureName,
                  arrival: fav.arrivalName
                });
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

        {/* 予測結果セクション */}
        {prediction && (
          <PredictionResults
            prediction={prediction}
            selectedRouteId={selectedRouteId}
            date={date}
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
