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
import { getRouteById, getStationById, getCommonLines, getJRStatusUrl, Station } from '@/lib/hokkaido-data';
import { calculateSuspensionRisk, calculateWeeklyForecast } from '@/lib/prediction-engine';
import { fetchRealWeatherForecast, fetchHourlyWeatherForecast, fetchAllHokkaidoWarnings, findNearestWeatherPoint, getRouteCoordinates, fetchDailyWeatherForecast } from '@/lib/weather';
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

  const [weather, setWeather] = useState<WeatherForecast[]>([]);
  const [warnings, setWarnings] = useState<Array<{ area: string; warnings: WeatherWarning[] }>>([]);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [isWeatherLoading, setIsWeatherLoading] = useState(true);
  const [lastWeatherUpdate, setLastWeatherUpdate] = useState<string>('');
  const [locationName, setLocationName] = useState<string>('札幌');
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | undefined>(undefined);

  // お気に入りフック
  const { favorites, addFavorite, removeFavorite, isFavorite, isLoaded: isFavoritesLoaded } = useFavorites();

  // 現在時刻の更新
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  // 天気データと警報の取得
  useEffect(() => {
    const loadData = async () => {
      setIsWeatherLoading(true);

      // 1. 位置情報の取得（ブラウザAPI）
      let currentCoords: { lat: number; lon: number } | undefined = undefined;

      try {
        if (navigator.geolocation) {
          await new Promise<void>((resolve) => {
            navigator.geolocation.getCurrentPosition(
              (position) => {
                currentCoords = {
                  lat: position.coords.latitude,
                  lon: position.coords.longitude
                };
                setUserLocation(currentCoords);

                // 最寄りの地点名を特定
                const nearest = findNearestWeatherPoint(currentCoords.lat, currentCoords.lon);
                setLocationName(nearest.name); // 例: "千歳"
                resolve();
              },
              (err) => {
                console.log('Geolocation denied/error:', err);
                // 札幌（デフォルト）のまま
                resolve();
              },
              { timeout: 5000 }
            );
          });
        }
      } catch (e) {
        console.error('Geolocation setup failed', e);
      }

      // 2. 現在地（またはデフォルト）の天気予報取得
      try {
        // 現在地の座標を渡して天気取得 (routeIdなしで座標指定)
        const realWeather = await fetchDailyWeatherForecast(undefined, currentCoords);
        setWeather(realWeather);
        setLastWeatherUpdate(new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }));
      } catch (error) {
        console.error('Weather fetch failed:', error);
      }

      // 3. 全道の警報取得
      try {
        const allWarnings = await fetchAllHokkaidoWarnings();
        setWarnings(allWarnings);
      } catch (error) {
        console.error('Warning fetch failed:', error);
      } finally {
        setIsWeatherLoading(false);
      }
    };

    loadData();

    // 30分ごとに更新
    const interval = setInterval(loadData, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);



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
            <h1 className="text-lg font-bold">運休AI</h1>
            <span className="text-xs opacity-80 ml-1">北海道JR</span>
          </div>
          <div className="text-right text-sm">
            <div className="opacity-80 text-xs">札幌</div>
            <div className="font-semibold">{currentTime}</div>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-4 pb-24 md:px-6">


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
            />

            {/* 状況報告（代替ルートの前へ移動） */}
            <ReportButtons
              routeId={selectedRouteId}
              routeName={getRouteById(selectedRouteId)?.name || ''}
              onReport={handleReport}
              counts={realtimeStatus?.last30minCounts ? {
                stopped: realtimeStatus.last30minCounts.stopped,
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

            {/* JR公式運行情報リンク */}
            {selectedRouteId && (
              <a
                href={getJRStatusUrl(selectedRouteId).url}
                target="_blank"
                rel="noopener noreferrer"
                className="card p-4 flex items-center justify-between hover:bg-[var(--background-secondary)] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[var(--primary)] text-white flex items-center justify-center">
                    <ExternalLink className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-medium text-sm">JR北海道 公式運行情報</div>
                    <div className="text-xs text-[var(--muted)]">
                      {getJRStatusUrl(selectedRouteId).label}
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-[var(--muted)]" />
              </a>
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

        {/* Pro誘導バナー */}
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

        {/* フッター */}
        <footer className="mt-8 text-center text-xs text-[var(--muted)]">
          <p>© 2026 運休AI - 予測は参考情報です。最新情報はJR北海道の公式発表をご確認ください。</p>
          <p className="mt-1 text-[10px]">天気データ: Open-Meteo API</p>
        </footer>
      </div>
    </main>
  );
}
