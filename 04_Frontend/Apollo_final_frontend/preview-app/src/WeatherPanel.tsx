import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  CloudRain, Droplets, Wind, Sun, Thermometer, RefreshCw, Search,
  MapPin, Cloud, CloudSun, AlertTriangle, CheckCircle2, Info,
  Eye, Gauge as GaugeIcon, Activity
} from 'lucide-react';
import {
  ResponsiveContainer, ComposedChart, Line, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, Area, AreaChart, BarChart, RadarChart,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { API_BASE } from './api/client';
import { fetchBackendWeatherRaw } from './api/weather';

/* ─── Types ─────────────────────────────────────────────────────────────── */
interface WeatherData {
  temperature_c: number;
  humidity_pct: number;
  rainfall_mm: number;
  wind_speed_m_s: number;
  solar_radiation_w_m2: number;
  feels_like?: number;
  dew_point?: number;
  pressure?: number;
  visibility?: number;
  uv_index?: number;
  condition?: string;
  wind_dir?: string;
}

interface WeatherResponse {
  status: string;
  city: string;
  country: string;
  source: string;
  latitude: number;
  longitude: number;
  date: string;
  utc_hour: string;
  weather: WeatherData;
  message?: string;
}

interface HourlyPoint {
  time: string;
  temp: number;
  humidity: number;
  rain: number;
  wind: number;
  solar: number;
}

interface ForecastDay {
  date: string;
  label: string;
  tempMax: number;
  tempMin: number;
  rain: number;
  humidity: number;
  condition: string;
  icon: 'sun' | 'cloud' | 'rain' | 'partly';
}

interface CityOption {
  name: string;
  state: string;
  lat: number;
  lon: number;
  temp?: number;
  condition?: string;
}

type MapMetric = 'Temperature' | 'Rainfall' | 'Humidity' | 'Wind';
type TabId = 'live' | 'forecast' | 'historical' | 'maps' | 'extreme' | 'api';

/* ─── Popular Indian cities ─────────────────────────────────────────────── */
const POPULAR_CITIES: CityOption[] = [
  { name: 'Solapur', state: 'Maharashtra', lat: 17.66, lon: 75.91 },
  { name: 'Nashik', state: 'Maharashtra', lat: 19.99, lon: 73.78 },
  { name: 'Pune', state: 'Maharashtra', lat: 18.52, lon: 73.86 },
  { name: 'Bengaluru', state: 'Karnataka', lat: 12.97, lon: 77.59 },
  { name: 'Hyderabad', state: 'Telangana', lat: 17.38, lon: 78.48 },
];

/* Extra map sample cities for regional visualization */
const MAP_CITIES: CityOption[] = [
  { name: 'Leh', state: 'Ladakh', lat: 34.15, lon: 77.58 },
  { name: 'Srinagar', state: 'J&K', lat: 34.08, lon: 74.80 },
  { name: 'Chandigarh', state: 'Chandigarh', lat: 30.73, lon: 76.78 },
  { name: 'Delhi', state: 'Delhi', lat: 28.61, lon: 77.21 },
  { name: 'Jaipur', state: 'Rajasthan', lat: 26.91, lon: 75.79 },
  { name: 'Lucknow', state: 'Uttar Pradesh', lat: 26.85, lon: 80.95 },
  { name: 'Patna', state: 'Bihar', lat: 25.59, lon: 85.14 },
  { name: 'Ahmedabad', state: 'Gujarat', lat: 23.03, lon: 72.58 },
  { name: 'Bhopal', state: 'Madhya Pradesh', lat: 23.26, lon: 77.41 },
  { name: 'Kolkata', state: 'West Bengal', lat: 22.57, lon: 88.36 },
  { name: 'Mumbai', state: 'Maharashtra', lat: 19.08, lon: 72.88 },
  { name: 'Solapur', state: 'Maharashtra', lat: 17.66, lon: 75.91 },
  { name: 'Hyderabad', state: 'Telangana', lat: 17.38, lon: 78.48 },
  { name: 'Bengaluru', state: 'Karnataka', lat: 12.97, lon: 77.59 },
  { name: 'Chennai', state: 'Tamil Nadu', lat: 13.08, lon: 80.27 },
  { name: 'Thiruvananthapuram', state: 'Kerala', lat: 8.52, lon: 76.94 },
  { name: 'Nashik', state: 'Maharashtra', lat: 19.99, lon: 73.78 },
  { name: 'Pune', state: 'Maharashtra', lat: 18.52, lon: 73.86 },
];

/** Per-city label offsets (viewBox 1000×1100) to avoid overlaps */
const LABEL_LAYOUT: Record<string, { dx: number; dy: number; anchor: 'start' | 'end' }> = {
  // Far north: pull labels outside Kashmir outline
  Leh: { dx: 36, dy: -40, anchor: 'start' },
  Srinagar: { dx: -40, dy: -36, anchor: 'end' },
  Chandigarh: { dx: 28, dy: -36, anchor: 'start' },
  Delhi: { dx: 24, dy: -10, anchor: 'start' },
  Jaipur: { dx: -28, dy: 18, anchor: 'end' },
  Lucknow: { dx: 26, dy: -22, anchor: 'start' },
  Patna: { dx: 22, dy: 20, anchor: 'start' },
  Ahmedabad: { dx: -30, dy: -16, anchor: 'end' },
  Bhopal: { dx: 22, dy: 24, anchor: 'start' },
  Kolkata: { dx: 22, dy: -8, anchor: 'start' },
  Mumbai: { dx: -32, dy: -28, anchor: 'end' },
  Pune: { dx: -32, dy: 32, anchor: 'end' },
  Solapur: { dx: 26, dy: 14, anchor: 'start' },
  Hyderabad: { dx: 28, dy: -20, anchor: 'start' },
  Bengaluru: { dx: -30, dy: 10, anchor: 'end' },
  Chennai: { dx: 28, dy: 16, anchor: 'start' },
  Thiruvananthapuram: { dx: 22, dy: 26, anchor: 'start' },
  // Nashik: dot only (too close to Mumbai/Pune) — omit from layout
};




/* Official Natural Earth geometry (world-atlas 50m) — real India coastline */
const INDIA_VIEWBOX = '0 0 1000 1100';
const INDIA_PATH = 'M 271.5 127.1 L 292.3 111.0 L 313.0 94.8 L 330.8 85.0 L 351.6 78.6 L 372.4 81.8 L 390.2 94.8 L 402.1 111.0 L 411.0 127.1 L 402.1 143.3 L 381.3 156.3 L 360.5 162.8 L 336.8 159.5 L 313.0 149.8 L 292.3 143.3 L 274.5 136.9 L 271.5 127.1 Z M 74.6 471.8 L 78.1 469.5 L 84.2 468.2 L 91.1 468.3 L 91.7 457.7 L 92.8 457.0 L 94.2 458.6 L 96.4 457.7 L 100.9 457.9 L 106.3 458.5 L 115.9 458.3 L 120.6 461.5 L 127.0 461.6 L 131.0 459.4 L 137.6 455.6 L 145.3 453.6 L 145.5 456.4 L 148.6 459.2 L 151.8 459.2 L 155.3 456.0 L 158.2 455.5 L 160.0 453.2 L 157.9 451.4 L 157.8 448.6 L 158.8 446.0 L 159.3 442.6 L 155.1 432.7 L 149.9 424.1 L 148.5 414.5 L 147.3 412.4 L 144.0 412.6 L 138.7 412.5 L 132.1 405.3 L 131.3 400.1 L 133.4 391.1 L 133.4 386.0 L 130.8 383.6 L 121.2 382.1 L 114.4 378.4 L 113.4 376.3 L 115.3 366.0 L 117.8 362.6 L 120.8 359.9 L 130.6 347.5 L 134.8 341.0 L 138.5 338.2 L 143.5 336.9 L 147.6 339.6 L 149.6 345.1 L 152.7 347.0 L 164.2 343.1 L 174.8 341.8 L 184.5 338.8 L 186.9 331.9 L 193.7 323.9 L 197.0 315.1 L 206.9 308.6 L 216.6 302.4 L 224.9 287.4 L 227.5 280.2 L 231.9 273.8 L 242.1 269.9 L 245.7 265.6 L 244.2 261.4 L 244.8 258.8 L 254.2 247.9 L 259.1 243.9 L 266.6 239.3 L 265.8 236.8 L 263.1 234.4 L 265.4 225.4 L 262.9 217.4 L 264.2 214.0 L 269.7 209.8 L 281.5 204.7 L 287.1 201.1 L 286.4 197.8 L 280.6 194.5 L 271.2 193.3 L 267.3 191.3 L 267.4 183.6 L 265.2 183.7 L 258.2 183.2 L 257.6 180.2 L 256.7 176.0 L 254.4 175.0 L 249.1 171.1 L 247.4 168.6 L 249.3 166.0 L 251.9 161.0 L 251.6 158.1 L 247.9 155.2 L 247.0 152.4 L 250.1 148.6 L 255.2 145.1 L 254.0 143.2 L 246.3 142.7 L 244.9 140.9 L 245.9 138.7 L 246.9 135.7 L 242.1 132.8 L 242.2 129.7 L 244.2 126.2 L 249.4 121.3 L 256.6 118.5 L 265.4 120.2 L 276.0 122.4 L 283.0 122.6 L 290.8 126.0 L 298.5 127.0 L 305.2 123.5 L 312.2 121.7 L 322.2 119.3 L 327.8 117.9 L 329.6 114.9 L 333.6 112.9 L 337.7 108.9 L 341.8 105.4 L 349.4 101.2 L 357.5 96.6 L 360.6 95.0 L 362.1 96.0 L 364.9 95.7 L 367.7 95.4 L 366.7 101.0 L 368.7 106.6 L 373.5 118.4 L 376.2 123.7 L 386.3 126.6 L 392.1 130.7 L 395.2 133.5 L 395.3 136.0 L 388.8 140.5 L 388.0 142.9 L 389.7 149.5 L 390.3 159.5 L 393.7 163.2 L 396.5 166.3 L 399.5 168.4 L 399.8 172.2 L 399.4 175.0 L 402.1 177.4 L 402.2 181.9 L 403.1 185.3 L 402.7 191.7 L 401.2 192.0 L 398.1 195.5 L 393.7 196.5 L 389.3 193.0 L 388.4 190.0 L 385.2 189.4 L 378.7 190.0 L 378.0 191.3 L 379.6 195.2 L 380.9 200.4 L 386.5 207.4 L 388.3 209.4 L 386.9 214.4 L 388.8 218.8 L 388.9 222.6 L 389.0 226.4 L 388.9 230.7 L 391.6 230.7 L 394.6 229.6 L 396.5 227.1 L 399.3 227.4 L 406.2 237.0 L 407.7 238.4 L 412.9 242.1 L 419.7 241.5 L 423.3 243.9 L 423.6 244.1 L 430.2 247.3 L 431.9 250.7 L 431.5 254.5 L 437.9 256.4 L 443.9 258.3 L 448.0 261.2 L 455.0 265.2 L 454.5 267.1 L 451.0 268.3 L 446.2 273.1 L 442.1 276.1 L 435.3 286.7 L 433.4 294.9 L 430.9 301.2 L 428.3 305.4 L 427.9 310.7 L 432.5 314.2 L 438.3 317.8 L 440.5 317.0 L 443.3 316.6 L 447.3 319.7 L 452.4 322.4 L 460.5 326.7 L 462.6 329.8 L 469.9 335.6 L 478.0 340.4 L 482.1 341.7 L 484.8 340.4 L 488.5 342.0 L 498.5 348.2 L 505.2 348.2 L 507.0 353.2 L 516.8 355.6 L 523.4 358.0 L 526.2 355.6 L 531.2 355.2 L 539.4 357.8 L 545.2 355.0 L 551.3 356.1 L 562.6 360.3 L 563.9 363.4 L 564.9 368.7 L 574.8 373.9 L 577.9 374.5 L 579.4 377.1 L 581.3 378.1 L 587.7 376.6 L 593.4 375.5 L 595.2 379.3 L 597.8 382.8 L 604.1 381.3 L 611.0 383.0 L 616.1 384.4 L 624.7 388.3 L 634.0 384.4 L 636.2 388.4 L 642.1 390.7 L 648.7 389.3 L 655.8 388.5 L 663.0 390.0 L 664.9 388.5 L 668.1 378.9 L 666.6 372.3 L 662.7 365.6 L 665.3 351.7 L 667.6 345.7 L 667.6 342.7 L 666.1 340.7 L 667.4 339.3 L 675.9 337.3 L 679.0 335.7 L 681.6 334.6 L 687.1 337.4 L 688.4 341.9 L 685.5 353.1 L 687.9 358.2 L 689.4 360.4 L 685.2 364.3 L 687.4 366.8 L 688.7 371.3 L 694.1 374.4 L 702.8 374.9 L 707.0 376.4 L 710.3 377.2 L 710.9 378.4 L 714.0 379.3 L 720.8 378.9 L 728.6 374.9 L 732.8 373.6 L 739.2 376.6 L 744.6 377.4 L 756.2 376.4 L 765.0 374.3 L 767.6 376.2 L 774.6 375.5 L 779.0 374.5 L 781.9 374.7 L 784.1 372.7 L 782.8 368.7 L 781.7 366.8 L 782.8 363.1 L 783.2 358.2 L 780.5 355.1 L 774.3 355.6 L 769.9 351.9 L 770.0 348.1 L 771.1 345.4 L 776.7 345.8 L 781.3 346.4 L 786.7 343.7 L 789.3 342.8 L 792.1 343.4 L 796.2 342.6 L 801.6 339.3 L 802.4 336.8 L 801.1 335.6 L 802.8 332.9 L 812.6 327.0 L 816.3 321.7 L 819.1 317.2 L 831.3 315.3 L 838.4 311.6 L 841.7 308.3 L 844.6 306.0 L 850.0 300.6 L 859.7 295.1 L 863.0 297.1 L 864.1 299.5 L 871.0 300.4 L 879.3 303.6 L 882.5 304.0 L 884.5 301.9 L 886.3 300.3 L 892.0 295.1 L 901.7 290.8 L 904.5 292.9 L 907.6 297.3 L 911.2 297.2 L 908.7 300.0 L 904.3 302.6 L 904.7 307.7 L 910.9 304.4 L 914.5 304.5 L 917.0 310.7 L 912.4 318.0 L 910.5 321.5 L 908.9 323.8 L 910.2 325.1 L 912.2 325.7 L 918.5 322.7 L 923.6 325.7 L 929.7 326.7 L 934.6 326.6 L 939.9 330.6 L 939.3 334.8 L 940.5 338.2 L 939.4 340.6 L 935.1 342.9 L 929.2 347.4 L 926.6 351.0 L 927.4 355.8 L 933.3 366.3 L 929.0 365.7 L 924.4 360.4 L 920.4 359.0 L 906.3 361.5 L 899.8 365.9 L 895.8 369.5 L 884.7 377.9 L 876.9 381.6 L 873.6 385.4 L 872.5 391.1 L 874.2 399.4 L 874.9 401.1 L 872.1 404.3 L 870.7 409.8 L 866.9 415.4 L 861.1 419.9 L 858.5 424.4 L 857.7 427.8 L 859.5 429.5 L 862.2 431.6 L 861.0 437.0 L 855.9 446.5 L 852.5 451.8 L 847.8 463.5 L 845.1 471.2 L 841.6 470.3 L 834.1 467.9 L 830.4 466.9 L 826.3 468.0 L 822.1 464.8 L 820.7 466.4 L 823.9 477.5 L 823.2 488.5 L 822.0 496.8 L 819.1 499.0 L 816.5 498.5 L 816.5 502.5 L 813.9 508.7 L 814.8 514.2 L 816.5 522.4 L 815.2 525.2 L 812.9 526.0 L 810.6 531.8 L 807.3 531.6 L 803.3 527.6 L 801.9 528.5 L 800.7 531.5 L 798.6 530.4 L 797.0 514.9 L 795.7 508.2 L 793.6 502.9 L 792.1 497.2 L 791.9 489.0 L 789.2 477.4 L 786.4 476.2 L 783.2 477.6 L 779.8 477.3 L 780.1 483.2 L 775.7 487.9 L 774.8 492.7 L 774.6 497.8 L 770.6 500.2 L 767.4 498.4 L 765.2 493.0 L 763.3 493.1 L 763.2 497.1 L 762.3 497.0 L 759.8 487.4 L 757.1 478.1 L 759.1 469.7 L 762.6 465.2 L 763.9 463.9 L 769.2 463.7 L 772.1 461.0 L 775.2 460.3 L 778.3 460.8 L 779.9 456.6 L 782.0 455.1 L 784.4 454.6 L 785.4 451.1 L 788.7 442.2 L 788.7 438.6 L 793.4 439.7 L 796.1 439.0 L 795.8 436.6 L 788.0 431.2 L 774.9 429.6 L 764.0 429.8 L 753.4 429.1 L 740.8 429.3 L 735.6 429.7 L 726.1 427.7 L 718.6 425.3 L 717.1 424.9 L 716.6 422.6 L 716.7 407.6 L 714.0 396.8 L 711.2 395.4 L 709.9 398.1 L 709.2 402.2 L 703.9 402.2 L 698.4 398.9 L 696.0 392.4 L 693.5 389.1 L 691.5 389.0 L 691.4 391.5 L 692.0 394.3 L 689.9 393.9 L 685.8 393.3 L 683.5 392.9 L 681.6 388.4 L 675.7 383.9 L 673.5 386.1 L 674.7 387.1 L 676.5 389.4 L 674.5 392.3 L 670.2 396.6 L 667.1 401.8 L 665.7 406.0 L 667.6 408.5 L 674.0 412.1 L 678.1 417.4 L 686.0 418.9 L 687.6 422.9 L 691.2 425.3 L 690.8 427.5 L 687.5 429.1 L 683.3 428.9 L 676.7 428.7 L 672.6 438.6 L 668.8 437.3 L 664.5 444.1 L 663.9 446.8 L 667.5 451.4 L 671.7 451.6 L 675.0 454.5 L 682.3 456.6 L 684.9 459.6 L 684.4 464.9 L 681.7 472.8 L 680.9 480.0 L 682.1 481.7 L 685.2 485.4 L 684.7 491.3 L 689.9 492.7 L 688.5 498.2 L 690.0 504.6 L 690.7 510.2 L 692.1 515.3 L 694.6 525.9 L 693.7 534.0 L 693.5 537.3 L 694.5 543.1 L 690.2 543.1 L 687.9 542.9 L 684.4 544.1 L 683.8 540.5 L 684.9 530.7 L 682.8 529.7 L 680.0 537.3 L 680.6 542.9 L 672.3 540.9 L 671.5 541.7 L 666.9 543.7 L 666.1 538.6 L 669.0 527.4 L 663.0 523.3 L 662.1 523.7 L 665.7 526.0 L 666.4 530.4 L 661.7 537.5 L 653.6 543.1 L 636.5 548.1 L 629.4 556.6 L 630.5 565.4 L 632.8 574.0 L 628.6 579.4 L 626.7 585.2 L 618.7 591.1 L 615.1 596.5 L 611.1 594.9 L 612.8 598.5 L 610.3 600.1 L 591.2 606.6 L 589.3 605.5 L 590.7 601.0 L 587.8 600.1 L 579.1 608.9 L 581.0 609.6 L 587.2 607.8 L 580.9 612.6 L 566.8 627.4 L 562.6 632.8 L 549.9 648.5 L 534.3 659.1 L 526.4 668.4 L 514.1 678.9 L 495.8 690.7 L 493.5 695.9 L 495.5 699.4 L 495.2 703.3 L 492.8 708.0 L 478.1 715.5 L 467.4 714.3 L 462.6 717.7 L 456.4 730.0 L 454.8 734.0 L 451.5 733.2 L 449.0 730.5 L 445.0 729.6 L 434.5 735.5 L 427.4 756.2 L 430.7 772.2 L 430.9 779.7 L 429.2 784.1 L 432.5 795.6 L 433.1 801.1 L 433.7 806.5 L 430.5 800.2 L 429.2 806.2 L 436.0 811.6 L 430.0 841.1 L 425.2 848.1 L 419.0 865.7 L 419.7 873.7 L 416.7 878.0 L 420.9 879.4 L 421.4 895.6 L 418.6 910.6 L 413.6 910.4 L 407.7 910.6 L 403.6 914.8 L 396.1 930.8 L 393.7 938.2 L 396.7 942.1 L 404.3 943.6 L 408.3 946.6 L 395.5 944.1 L 374.6 953.2 L 370.5 963.8 L 368.3 972.8 L 354.2 981.0 L 345.7 980.5 L 335.8 972.0 L 323.5 956.0 L 321.1 947.6 L 319.6 946.1 L 316.8 938.2 L 314.3 922.8 L 317.3 926.0 L 318.3 935.4 L 320.7 935.5 L 314.4 919.9 L 312.9 917.7 L 313.0 914.0 L 309.9 907.4 L 302.5 886.2 L 296.6 872.9 L 290.0 861.8 L 284.2 854.9 L 275.7 837.4 L 271.6 824.1 L 268.0 806.9 L 267.6 801.7 L 262.5 789.4 L 261.6 783.9 L 259.1 774.9 L 256.1 769.9 L 250.4 761.7 L 246.3 756.2 L 241.9 745.7 L 243.4 743.0 L 240.9 740.0 L 239.9 737.3 L 236.1 730.4 L 231.5 721.3 L 225.2 687.4 L 222.7 673.7 L 217.8 658.2 L 216.3 649.6 L 214.3 640.6 L 215.1 636.2 L 218.3 628.4 L 215.1 628.6 L 212.2 626.5 L 212.0 620.9 L 217.7 620.1 L 211.1 615.7 L 212.1 612.2 L 209.1 604.6 L 208.2 602.1 L 214.5 578.4 L 214.4 569.8 L 212.8 561.6 L 210.7 560.1 L 206.9 552.2 L 210.2 549.0 L 206.6 549.4 L 212.4 544.2 L 221.4 540.0 L 213.4 542.0 L 206.0 535.9 L 209.2 532.8 L 203.8 532.7 L 207.1 525.5 L 212.4 524.3 L 205.9 522.9 L 198.3 523.2 L 195.6 523.9 L 196.6 529.0 L 193.2 532.4 L 190.6 536.3 L 191.5 538.6 L 194.7 540.7 L 195.9 547.1 L 188.9 559.2 L 170.5 568.5 L 155.1 573.5 L 143.4 569.5 L 130.0 558.5 L 115.5 542.3 L 105.0 532.2 L 98.5 522.5 L 100.9 517.8 L 105.1 521.0 L 107.6 522.7 L 118.8 518.8 L 123.6 517.3 L 131.5 514.0 L 138.8 505.5 L 144.2 499.4 L 143.6 496.6 L 140.8 498.5 L 139.1 501.5 L 134.7 500.6 L 124.6 504.2 L 119.1 507.3 L 93.9 497.8 L 85.4 487.7 L 83.1 479.1 L 92.7 471.9 L 84.4 475.3 L 79.9 479.5 L 75.4 475.9 L 74.6 471.8 Z M 803.4 870.7 L 802.7 871.5 L 801.7 870.7 L 799.1 864.8 L 798.5 861.1 L 797.8 859.8 L 798.7 858.0 L 800.0 857.3 L 800.7 855.3 L 801.0 852.1 L 802.0 849.5 L 802.6 848.7 L 804.7 848.7 L 805.4 848.4 L 805.0 845.9 L 803.8 844.8 L 803.3 844.1 L 803.3 838.2 L 803.6 835.8 L 804.5 834.1 L 803.9 830.5 L 804.3 829.1 L 805.9 827.3 L 806.6 823.2 L 806.0 822.0 L 807.5 815.9 L 807.4 811.8 L 809.4 807.6 L 812.5 805.7 L 813.5 805.7 L 813.6 809.2 L 813.9 810.4 L 812.1 812.4 L 813.8 815.2 L 813.6 816.1 L 812.9 818.3 L 811.8 820.4 L 810.2 821.3 L 809.0 824.1 L 808.2 825.2 L 810.6 828.2 L 811.3 838.3 L 809.6 841.0 L 807.6 841.6 L 808.0 848.4 L 807.7 849.8 L 805.7 853.1 L 805.2 854.6 L 804.1 855.9 L 804.6 857.6 L 805.6 858.4 L 805.6 859.8 L 804.7 863.4 L 804.6 867.4 L 803.4 870.7 Z M 220.1 976.5 L 219.7 976.9 L 219.2 977.1 L 218.9 977.0 L 218.8 976.6 L 218.8 976.3 L 219.2 976.7 L 219.8 976.4 L 220.3 975.3 L 220.4 975.0 L 220.5 975.2 L 220.4 975.7 L 220.1 976.5 Z M 827.6 983.4 L 826.2 984.6 L 825.8 984.4 L 825.7 983.5 L 825.5 982.9 L 825.3 981.7 L 825.1 979.7 L 826.3 978.0 L 827.4 978.3 L 826.8 980.1 L 827.6 983.4 Z M 796.8 902.5 L 796.0 903.6 L 792.9 902.8 L 793.2 899.4 L 792.4 896.1 L 793.0 894.8 L 795.2 892.4 L 797.1 891.4 L 798.4 894.6 L 798.9 897.7 L 796.8 902.5 Z M 838.0 1023.1 L 836.2 1025.8 L 832.7 1017.6 L 831.1 1017.1 L 831.1 1013.2 L 832.0 1011.7 L 836.0 1010.0 L 837.1 1010.9 L 839.2 1018.5 L 838.0 1023.1 Z M 824.8 989.2 L 822.4 989.2 L 821.8 987.9 L 820.8 986.4 L 821.5 985.0 L 822.8 984.7 L 824.5 986.9 L 824.9 988.5 L 824.8 989.2 Z M 805.4 948.4 L 804.0 948.6 L 803.2 947.5 L 803.1 946.2 L 803.9 945.4 L 804.5 945.0 L 805.2 945.0 L 806.0 947.2 L 805.4 948.4 Z';

function latLonToXY(lat: number, lon: number): { x: number; y: number } {
  // Match INDIA_PATH projection (Natural Earth 50m): lon 67–98, lat 6–37.5
  const x = ((lon - 67.0) / (98.0 - 67.0)) * 920 + 40;
  const y = ((37.5 - lat) / (37.5 - 6.0)) * 1020 + 30;
  return { x: Math.max(10, Math.min(990, x)), y: Math.max(10, Math.min(1090, y)) };
}

function tempToColor(t: number): string {
  if (t >= 36) return '#ef4444';
  if (t >= 32) return '#f97316';
  if (t >= 28) return '#eab308';
  if (t >= 24) return '#84cc16';
  if (t >= 20) return '#22c55e';
  if (t >= 15) return '#14b8a6';
  if (t >= 10) return '#3b82f6';
  return '#6366f1';
}

function metricToColor(metric: MapMetric, v: number): string {
  if (metric === 'Temperature') return tempToColor(v);
  if (metric === 'Rainfall') {
    if (v >= 20) return '#1e3a8a';
    if (v >= 10) return '#2563eb';
    if (v >= 5) return '#38bdf8';
    if (v >= 1) return '#7dd3fc';
    return '#e0f2fe';
  }
  if (metric === 'Humidity') {
    if (v >= 85) return '#0e7490';
    if (v >= 70) return '#06b6d4';
    if (v >= 50) return '#22d3ee';
    return '#a5f3fc';
  }
  // Wind km/h
  if (v >= 30) return '#7c3aed';
  if (v >= 20) return '#a78bfa';
  if (v >= 10) return '#34d399';
  return '#a7f3d0';
}

function mapGradient(metric: MapMetric): { stops: { offset: string; color: string }[]; legendHi: string; legendLo: string; unit: string } {
  switch (metric) {
    case 'Temperature':
      return {
        stops: [
          { offset: '0%', color: '#ef4444' },
          { offset: '20%', color: '#f97316' },
          { offset: '40%', color: '#eab308' },
          { offset: '55%', color: '#84cc16' },
          { offset: '70%', color: '#22c55e' },
          { offset: '85%', color: '#3b82f6' },
          { offset: '100%', color: '#6366f1' },
        ],
        legendHi: '40°C',
        legendLo: '0°C',
        unit: '°C',
      };
    case 'Rainfall':
      return {
        stops: [
          { offset: '0%', color: '#1e3a8a' },
          { offset: '30%', color: '#2563eb' },
          { offset: '55%', color: '#38bdf8' },
          { offset: '80%', color: '#a5f3fc' },
          { offset: '100%', color: '#f0fdfa' },
        ],
        legendHi: '40 mm',
        legendLo: '0 mm',
        unit: 'mm',
      };
    case 'Humidity':
      return {
        stops: [
          { offset: '0%', color: '#0e7490' },
          { offset: '35%', color: '#06b6d4' },
          { offset: '65%', color: '#67e8f9' },
          { offset: '100%', color: '#ecfeff' },
        ],
        legendHi: '100%',
        legendLo: '20%',
        unit: '%',
      };
    case 'Wind':
    default:
      return {
        stops: [
          { offset: '0%', color: '#7c3aed' },
          { offset: '30%', color: '#8b5cf6' },
          { offset: '55%', color: '#34d399' },
          { offset: '80%', color: '#a7f3d0' },
          { offset: '100%', color: '#ecfdf5' },
        ],
        legendHi: '40 km/h',
        legendLo: '0 km/h',
        unit: 'km/h',
      };
  }
}

function cityMetricValue(metric: MapMetric, city: CityOption, cityTemps: Record<string, { temp: number; condition: string }>, selectedWeather?: WeatherData | null): number {
  if (selectedWeather && city.name === (city as any)._selected) return 0;
  const t = cityTemps[city.name]?.temp;
  // Synthesize regional variation when only temp is known
  const baseTemp = t ?? 28;
  switch (metric) {
    case 'Temperature':
      return baseTemp;
    case 'Rainfall':
      return Math.max(0, (baseTemp - 22) * 0.8 + (city.lat < 20 ? 4 : 1));
    case 'Humidity':
      return Math.min(95, Math.max(30, 100 - (baseTemp - 15) * 1.5 + (city.lon > 80 ? 8 : 0)));
    case 'Wind':
      return Math.max(2, Math.min(28, 8 + (35 - baseTemp) * 0.4 + Math.abs(city.lat - 20) * 0.3));
  }
}

/* ─── Helpers ───────────────────────────────────────────────────────────── */
function conditionFromWeather(temp: number, rain: number, cloud?: number): string {
  if (rain > 2) return 'Light Rain';
  if (rain > 0.2) return 'Partly Cloudy';
  if ((cloud ?? 0) > 70) return 'Cloudy';
  if (temp > 32) return 'Clear Sky';
  return 'Partly Cloudy';
}

function windDirFromDeg(deg: number): string {
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return dirs[Math.round(deg / 22.5) % 16];
}

function statusColor(status: string): string {
  if (status === 'Optimal' || status === 'Good' || status === 'None' || status === 'Calm') return 'text-emerald-400';
  if (status === 'Moderate' || status === 'Light Rain' || status === 'High') return 'text-amber-400';
  return 'text-slate-300';
}

function tempStatus(t: number): string {
  if (t >= 18 && t <= 32) return 'Optimal';
  if (t < 12 || t > 38) return 'Critical';
  return 'Moderate';
}
function humidityStatus(h: number): string {
  if (h >= 40 && h <= 75) return 'Optimal';
  if (h > 85) return 'High';
  return 'Moderate';
}
function rainStatus(r: number): string {
  if (r <= 0.1) return 'None';
  if (r < 5) return 'Light Rain';
  if (r < 15) return 'Moderate';
  return 'Heavy';
}
function windStatus(w: number): string {
  if (w < 3) return 'Calm';
  if (w < 8) return 'Moderate';
  return 'Strong';
}
function solarStatus(s: number): string {
  if (s > 500) return 'Good';
  if (s > 200) return 'Moderate';
  return 'Low';
}

function formatDateLabel(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

function iconForCondition(c: string): 'sun' | 'cloud' | 'rain' | 'partly' {
  const lower = c.toLowerCase();
  if (lower.includes('rain')) return 'rain';
  if (lower.includes('cloud') && !lower.includes('partly')) return 'cloud';
  if (lower.includes('partly') || lower.includes('light')) return 'partly';
  return 'sun';
}

const WeatherIcon = ({ type, size = 20, className = '' }: { type: string; size?: number; className?: string }) => {
  if (type === 'rain') return <CloudRain size={size} className={className || 'text-blue-400'} />;
  if (type === 'cloud') return <Cloud size={size} className={className || 'text-slate-300'} />;
  if (type === 'partly') return <CloudSun size={size} className={className || 'text-amber-300'} />;
  return <Sun size={size} className={className || 'text-amber-400'} />;
};

/* ─── Backend API (shared client) ───────────────────────────────────────── */
const WEATHER_API_BASE = API_BASE;

async function fetchBackendWeather(cityName: string): Promise<WeatherResponse | null> {
  try {
    const data = await fetchBackendWeatherRaw(cityName);
    if (!data) return null;
    const w = data.weather || {};
    const temp = Number(w.temperature_c ?? 0);
    const rain = Number(w.rainfall_mm ?? 0);
    return {
      status: 'success',
      city: data.city || cityName,
      country: data.country || 'India',
      source: data.source || 'Hybrid API',
      latitude: Number(data.latitude),
      longitude: Number(data.longitude),
      date: String(data.date || ''),
      utc_hour: String(data.utc_hour || ''),
      weather: {
        temperature_c: temp,
        humidity_pct: Number(w.humidity_pct ?? 0),
        rainfall_mm: rain,
        wind_speed_m_s: Number(w.wind_speed_m_s ?? 0),
        solar_radiation_w_m2: Number(w.solar_radiation_w_m2 ?? 0),
        feels_like: w.feels_like != null ? Number(w.feels_like) : undefined,
        dew_point: w.dew_point != null ? Number(w.dew_point) : undefined,
        pressure: w.pressure != null ? Number(w.pressure) : undefined,
        visibility: w.visibility != null ? Number(w.visibility) : undefined,
        uv_index: w.uv_index != null ? Number(w.uv_index) : undefined,
        condition: w.condition || conditionFromWeather(temp, rain),
        wind_dir: w.wind_dir,
      },
    };
  } catch {
    return null;
  }
}

async function fetchOpenMeteoCurrent(lat: number, lon: number): Promise<WeatherResponse> {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', String(lat));
  url.searchParams.set('longitude', String(lon));
  url.searchParams.set(
    'current',
    'temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,shortwave_radiation,apparent_temperature,dew_point_2m,surface_pressure,visibility,uv_index,weather_code,wind_direction_10m,cloud_cover'
  );
  url.searchParams.set('timezone', 'auto');
  url.searchParams.set('wind_speed_unit', 'ms');
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Open-Meteo HTTP ${res.status}`);
  const data = await res.json();
  const c = data.current || {};
  const rawTime: string = c.time || '';
  const cleanDate = rawTime.slice(0, 10).replace(/-/g, '') || new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const utcHour = rawTime.length >= 13 ? rawTime.slice(11, 13) : String(new Date().getUTCHours()).padStart(2, '0');
  const rain = Number(c.precipitation ?? 0);
  const temp = Number(c.temperature_2m ?? 0);
  return {
    status: 'success',
    city: '',
    country: 'India',
    source: 'Open-Meteo (Live · client fallback)',
    latitude: lat,
    longitude: lon,
    date: cleanDate,
    utc_hour: utcHour,
    weather: {
      temperature_c: temp,
      humidity_pct: Number(c.relative_humidity_2m ?? 0),
      rainfall_mm: rain,
      wind_speed_m_s: Number(c.wind_speed_10m ?? 0),
      solar_radiation_w_m2: Number(c.shortwave_radiation ?? 0),
      feels_like: Number(c.apparent_temperature ?? temp),
      dew_point: Number(c.dew_point_2m ?? 0),
      pressure: Number(c.surface_pressure ?? 1013),
      visibility: Number(((c.visibility ?? 10000) / 1000).toFixed(1)),
      uv_index: Number(c.uv_index ?? 0),
      condition: conditionFromWeather(temp, rain, Number(c.cloud_cover ?? 0)),
      wind_dir: windDirFromDeg(Number(c.wind_direction_10m ?? 0)),
    },
  };
}

async function fetchCurrentWeather(city: CityOption): Promise<WeatherResponse> {
  const fromBackend = await fetchBackendWeather(city.name);
  if (fromBackend) {
    try {
      const extra = await fetchOpenMeteoCurrent(fromBackend.latitude, fromBackend.longitude);
      fromBackend.weather = {
        ...fromBackend.weather,
        feels_like: fromBackend.weather.feels_like ?? extra.weather.feels_like,
        dew_point: fromBackend.weather.dew_point ?? extra.weather.dew_point,
        pressure: fromBackend.weather.pressure ?? extra.weather.pressure,
        visibility: fromBackend.weather.visibility ?? extra.weather.visibility,
        uv_index: fromBackend.weather.uv_index ?? extra.weather.uv_index,
        wind_dir: fromBackend.weather.wind_dir ?? extra.weather.wind_dir,
        condition: fromBackend.weather.condition || extra.weather.condition,
      };
    } catch { /* optional */ }
    return fromBackend;
  }
  const fallback = await fetchOpenMeteoCurrent(city.lat, city.lon);
  fallback.city = city.name;
  return fallback;
}

async function fetchHourlyTrends(lat: number, lon: number): Promise<HourlyPoint[]> {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', String(lat));
  url.searchParams.set('longitude', String(lon));
  url.searchParams.set('hourly', 'temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,shortwave_radiation');
  url.searchParams.set('timezone', 'auto');
  url.searchParams.set('forecast_days', '2');
  url.searchParams.set('wind_speed_unit', 'ms');
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error('Hourly fetch failed');
  const data = await res.json();
  const h = data.hourly;
  if (!h?.time) return [];
  const now = Date.now();
  const points: HourlyPoint[] = [];
  for (let i = 0; i < h.time.length; i++) {
    const t = new Date(h.time[i]).getTime();
    if (t < now - 12 * 3600_000 || t > now + 12 * 3600_000) continue;
    const d = new Date(h.time[i]);
    points.push({
      time: d.toLocaleTimeString('en-IN', { hour: 'numeric', hour12: true }),
      temp: Number(h.temperature_2m[i] ?? 0),
      humidity: Number(h.relative_humidity_2m[i] ?? 0),
      rain: Number(h.precipitation[i] ?? 0),
      wind: Number((Number(h.wind_speed_10m[i] ?? 0) * 3.6).toFixed(1)),
      solar: Number(h.shortwave_radiation[i] ?? 0),
    });
    if (points.length >= 24) break;
  }
  return points;
}

async function fetch7DayForecast(lat: number, lon: number): Promise<ForecastDay[]> {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', String(lat));
  url.searchParams.set('longitude', String(lon));
  url.searchParams.set('daily', 'temperature_2m_max,temperature_2m_min,precipitation_sum,relative_humidity_2m_mean,weather_code');
  url.searchParams.set('timezone', 'auto');
  url.searchParams.set('forecast_days', '7');
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error('Forecast fetch failed');
  const data = await res.json();
  const d = data.daily;
  if (!d?.time) return [];
  return d.time.map((iso: string, i: number) => {
    const rain = Number(d.precipitation_sum[i] ?? 0);
    const tmax = Number(d.temperature_2m_max[i] ?? 0);
    const condition = conditionFromWeather(tmax, rain);
    return {
      date: iso,
      label: formatDateLabel(iso),
      tempMax: Math.round(tmax),
      tempMin: Math.round(Number(d.temperature_2m_min[i] ?? 0)),
      rain: Number(rain.toFixed(1)),
      humidity: Math.round(Number(d.relative_humidity_2m_mean[i] ?? 0)),
      condition,
      icon: iconForCondition(condition),
    };
  });
}


async function fetchHistoricalDaily(lat: number, lon: number): Promise<{ day: string; temp: number; rain: number; humidity: number }[]> {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', String(lat));
  url.searchParams.set('longitude', String(lon));
  url.searchParams.set('daily', 'temperature_2m_mean,precipitation_sum,relative_humidity_2m_mean');
  url.searchParams.set('timezone', 'auto');
  url.searchParams.set('past_days', '14');
  url.searchParams.set('forecast_days', '0');
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error('Historical fetch failed');
  const data = await res.json();
  const d = data.daily;
  if (!d?.time) return [];
  return d.time.map((iso: string, i: number) => {
    const dt = new Date(iso + 'T12:00:00');
    return {
      day: dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      temp: Number(Number(d.temperature_2m_mean[i] ?? 0).toFixed(1)),
      rain: Number(Number(d.precipitation_sum[i] ?? 0).toFixed(1)),
      humidity: Math.round(Number(d.relative_humidity_2m_mean[i] ?? 0)),
    };
  });
}

async function geocodeCity(name: string): Promise<{ name: string; lat: number; lon: number; state?: string } | null> {
  const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
  url.searchParams.set('name', name);
  url.searchParams.set('count', '10');
  url.searchParams.set('language', 'en');
  url.searchParams.set('format', 'json');
  const res = await fetch(url.toString());
  if (!res.ok) return null;
  const data = await res.json();
  const results = data.results || [];
  const india = results.find((r: any) => r.country_code === 'IN') || results[0];
  if (!india) return null;
  return { name: india.name, lat: india.latitude, lon: india.longitude, state: india.admin1 };
}

/* ─── India Map component (inline) ──────────────────────────────────────── */
function IndiaWeatherMap({
  metric,
  selected,
  cityTemps,
  current,
  height = 320,
  showAllLabels = true,
}: {
  metric: MapMetric;
  selected: CityOption;
  cityTemps: Record<string, { temp: number; condition: string }>;
  current?: WeatherData | null;
  height?: number;
  showAllLabels?: boolean;
}) {
  const g = mapGradient(metric);
  const [zoom, setZoom] = useState(1);
  const [hover, setHover] = useState<string | null>(null);
  const minZ = 1;
  const maxZ = 3.5;

  const valueFor = (city: CityOption): number => {
    if (city.name === selected.name && current) {
      if (metric === 'Temperature') return current.temperature_c;
      if (metric === 'Rainfall') return current.rainfall_mm;
      if (metric === 'Humidity') return current.humidity_pct;
      return current.wind_speed_m_s * 3.6;
    }
    return cityMetricValue(metric, city, cityTemps);
  };

  const labelFor = (city: CityOption): string => {
    const v = valueFor(city);
    if (metric === 'Temperature') return `${v.toFixed(1)}°C`;
    if (metric === 'Humidity') return `${Math.round(v)}%`;
    if (metric === 'Rainfall') return `${v.toFixed(1)} mm`;
    return `${Math.round(v)} km/h`;
  };

  const focus = latLonToXY(selected.lat, selected.lon);
  const panX = zoom <= 1.05 ? 0 : (500 - focus.x) * (zoom - 1) * 0.9;
  const panY = zoom <= 1.05 ? 0 : (520 - focus.y) * (zoom - 1) * 0.9;
  const transform = `translate(${500 + panX} ${520 + panY}) scale(${zoom}) translate(-500 -520)`;

  // Cities whose labels collide with the narrow Kashmir lobe at full view
  const NORTH_CROWDED = new Set(['Srinagar', 'Leh', 'Chandigarh']);

  const shouldShowLabel = (c: CityOption) => {
    if (!showAllLabels) return false;
    if (c.name === selected.name) return true;
    if (!LABEL_LAYOUT[c.name]) return false;
    // North cluster: labels only when zoomed in (avoids Kashmir overlap)
    if (NORTH_CROWDED.has(c.name) && zoom < 1.55) return false;
    if (zoom < 1.25) {
      const sparse = new Set(['Delhi', 'Mumbai', 'Kolkata', 'Chennai', 'Bengaluru', 'Hyderabad', 'Ahmedabad', 'Thiruvananthapuram', 'Solapur', 'Jaipur']);
      return sparse.has(c.name);
    }
    return true;
  };

  const zoomIn = () => setZoom((z) => Math.min(maxZ, +(z + 0.4).toFixed(2)));
  const zoomOut = () => setZoom((z) => Math.max(minZ, +(z - 0.4).toFixed(2)));

  return (
    <div
      className="relative w-full rounded-xl overflow-hidden border border-[#1e2d40]"
      style={{ height, background: 'radial-gradient(ellipse at 48% 42%, #0b1c34 0%, #050a12 75%)' }}
    >
      <svg viewBox={INDIA_VIEWBOX} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id={`landGrad-${metric}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1a4a7a" />
            <stop offset="55%" stopColor="#143d66" />
            <stop offset="100%" stopColor="#0d2a4a" />
          </linearGradient>
          <linearGradient id={`metricFill-${metric}`} x1="0" y1="0" x2="0" y2="1">
            {g.stops.map((s) => (
              <stop key={s.offset} offset={s.offset} stopColor={s.color} stopOpacity={0.75} />
            ))}
          </linearGradient>
          <filter id="landShadow2" x="-5%" y="-5%" width="110%" height="110%">
            <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#000" floodOpacity="0.5" />
          </filter>
          <filter id="dotGlow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="2.5" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g transform={transform}>
          {[0,1,2,3,4,5,6,7,8,9].map((i) => (
            <line key={`gv${i}`} x1={80 + i * 90} y1={30} x2={80 + i * 90} y2={1070} stroke="#0f2744" strokeWidth={1 / zoom} />
          ))}
          {[0,1,2,3,4,5,6,7,8,9,10].map((i) => (
            <line key={`gh${i}`} x1={50} y1={50 + i * 95} x2={960} y2={50 + i * 95} stroke="#0f2744" strokeWidth={1 / zoom} />
          ))}

          <path
            d={INDIA_PATH}
            fill={metric === 'Temperature' ? `url(#landGrad-${metric})` : `url(#metricFill-${metric})`}
            stroke="#60a5fa"
            strokeWidth={2.2 / zoom}
            strokeOpacity="0.55"
            filter="url(#landShadow2)"
          />

          {MAP_CITIES.map((c) => {
            const { x, y } = latLonToXY(c.lat, c.lon);
            const active = c.name === selected.name;
            const color = metricToColor(metric, valueFor(c));
            const r = (active ? 9 : 7) / Math.sqrt(Math.max(zoom, 1));
            return (
              <g
                key={`dot-${c.name}`}
                onMouseEnter={() => setHover(c.name)}
                onMouseLeave={() => setHover(null)}
                style={{ cursor: 'pointer' }}
              >
                {active && (
                  <circle cx={x} cy={y} r={16 / Math.sqrt(zoom)} fill="none" stroke="#10b981" strokeWidth={2 / zoom} opacity="0.65">
                    <animate attributeName="r" values={`${12 / Math.sqrt(zoom)};${22 / Math.sqrt(zoom)};${12 / Math.sqrt(zoom)}`} dur="2.2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.65;0.12;0.65" dur="2.2s" repeatCount="indefinite" />
                  </circle>
                )}
                <circle
                  cx={x}
                  cy={y}
                  r={r}
                  fill={color}
                  stroke={active ? '#fff' : 'rgba(255,255,255,0.55)'}
                  strokeWidth={(active ? 2 : 1.2) / zoom}
                  filter="url(#dotGlow)"
                />
              </g>
            );
          })}

          {/* Permanent labels (no leader lines through land) */}
          {MAP_CITIES.filter(shouldShowLabel).map((c) => {
            const { x, y } = latLonToXY(c.lat, c.lon);
            const active = c.name === selected.name;
            const base = LABEL_LAYOUT[c.name] || { dx: 16, dy: -12, anchor: 'start' as const };
            const dx = base.dx / Math.sqrt(Math.max(zoom, 1));
            const dy = base.dy / Math.sqrt(Math.max(zoom, 1));
            const lx = x + dx;
            const ly = y + dy;
            const color = metricToColor(metric, valueFor(c));
            const value = labelFor(c);
            const fs = Math.max(10, 13 / Math.sqrt(Math.max(zoom * 0.85, 1)));
            const pad = 6;
            const boxW = Math.max(c.name.length, value.length) * fs * 0.58 + pad * 2;
            const boxH = fs * 2 + 12;
            const boxX = base.anchor === 'end' ? lx - boxW : lx;
            const boxY = ly - boxH / 2;
            return (
              <g key={`lbl-${c.name}`} style={{ pointerEvents: 'none' }}>
                <rect
                  x={boxX}
                  y={boxY}
                  width={boxW}
                  height={boxH}
                  rx={5}
                  fill="rgba(6,12,24,0.94)"
                  stroke={active ? '#10b981' : 'rgba(71,85,105,0.9)'}
                  strokeWidth={(active ? 1.4 : 1) / zoom}
                />
                <text
                  x={base.anchor === 'end' ? boxX + boxW - pad : boxX + pad}
                  y={boxY + fs + 1}
                  fill="#f8fafc"
                  fontSize={fs}
                  fontFamily="system-ui,Segoe UI,sans-serif"
                  fontWeight="600"
                  textAnchor={base.anchor === 'end' ? 'end' : 'start'}
                >
                  {c.name}
                </text>
                <text
                  x={base.anchor === 'end' ? boxX + boxW - pad : boxX + pad}
                  y={boxY + fs * 2 + 4}
                  fill={color}
                  fontSize={fs * 0.95}
                  fontFamily="system-ui,Segoe UI,sans-serif"
                  fontWeight="700"
                  textAnchor={base.anchor === 'end' ? 'end' : 'start'}
                >
                  {value}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      {/* Hover tooltip for unlabeled dots (e.g. Srinagar at 1×) */}
      {hover && !shouldShowLabel(MAP_CITIES.find((c) => c.name === hover) || MAP_CITIES[0]) && (
        <div className="absolute left-1/2 top-3 -translate-x-1/2 z-20 pointer-events-none">
          <div className="bg-[#0b131e]/95 border border-[#1e2d40] rounded-lg px-3 py-1.5 text-center shadow-lg">
            <div className="text-[12px] font-semibold text-white">{hover}</div>
            <div className="text-[11px] font-bold" style={{ color: metricToColor(metric, valueFor(MAP_CITIES.find((c) => c.name === hover)!)) }}>
              {labelFor(MAP_CITIES.find((c) => c.name === hover)!)}
            </div>
            <div className="text-[9px] text-slate-500 mt-0.5">Zoom in (+) for map labels</div>
          </div>
        </div>
      )}

      {/* Zoom */}
      <div className="absolute right-3 top-3 flex flex-col gap-1.5 z-10">
        <button type="button" onClick={zoomIn} disabled={zoom >= maxZ}
          className="w-8 h-8 rounded-lg bg-[#0b131e]/95 border border-[#1e2d40] text-slate-200 text-lg font-bold hover:border-emerald-500/50 hover:text-emerald-300 disabled:opacity-40">+</button>
        <button type="button" onClick={zoomOut} disabled={zoom <= minZ}
          className="w-8 h-8 rounded-lg bg-[#0b131e]/95 border border-[#1e2d40] text-slate-200 text-lg font-bold hover:border-emerald-500/50 hover:text-emerald-300 disabled:opacity-40">−</button>
        <button type="button" onClick={() => setZoom(1)}
          className="w-8 h-8 rounded-lg bg-[#0b131e]/95 border border-[#1e2d40] text-[10px] text-slate-400 hover:text-emerald-300">1×</button>
      </div>

      <div className="absolute left-3 top-3 bg-[#0b131e]/90 border border-[#1e2d40] rounded-lg px-2.5 py-2">
        <div className="text-[9px] text-slate-400 mb-1.5 font-medium">{metric}</div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-28 rounded-full border border-[#1e2d40]"
            style={{ background: `linear-gradient(to top, ${g.stops.slice().reverse().map((s) => s.color).join(', ')})` }} />
          <div className="flex flex-col justify-between h-28 text-[9px] text-slate-400 py-0.5">
            <span>{g.legendHi}</span>
            <span className="text-slate-500">{g.unit}</span>
            <span>{g.legendLo}</span>
          </div>
        </div>
      </div>

      <div className="absolute left-3 bottom-3 text-[11px] text-emerald-400 font-semibold bg-[#0b131e]/90 px-2.5 py-1.5 rounded-lg border border-[#1e2d40]">
        {selected.name} · {metric} · {zoom.toFixed(1)}×
      </div>
    </div>
  );
}

/* ─── Main Panel ────────────────────────────────────────────────────────── */
/** Shared live weather snapshot for Weather Summary panel */
export type LiveWeatherSummary = {
  city: string;
  temperature: number;
  humidity: number;
  rainfall: number;
  windKmh: number;
  condition: string;
  minTemp?: number;
  maxTemp?: number;
  source?: string;
  isBackend?: boolean;
  observationDate?: string;
  observationDateIso?: string;
  utcHour?: string;
};

export default function WeatherPanel({
  onLiveWeather,
  preferredCity,
  preferredLat,
  preferredLon,
}: {
  onLiveWeather?: (summary: LiveWeatherSummary) => void;
  preferredCity?: string;
  preferredLat?: number;
  preferredLon?: number;
} = {}) {
  const resolveCity = (): CityOption | null => {
    const name = preferredCity?.trim();
    if (!name) return null;
    // Match popular list only when coords not provided
    const hit = POPULAR_CITIES.find((c) => c.name.toLowerCase() === name.toLowerCase());
    if (hit) {
      // Prefer farmer-entered coords when available
      if (
        preferredLat != null &&
        preferredLon != null &&
        Number.isFinite(preferredLat) &&
        Number.isFinite(preferredLon)
      ) {
        return { ...hit, lat: preferredLat, lon: preferredLon };
      }
      return hit;
    }
    // Custom city — require coords from Settings; do NOT default to Solapur
    if (
      preferredLat != null &&
      preferredLon != null &&
      Number.isFinite(preferredLat) &&
      Number.isFinite(preferredLon)
    ) {
      return { name, lat: preferredLat, lon: preferredLon, state: '' };
    }
    // Name only — still select by name; geocode path may refine later
    return { name, lat: preferredLat || 0, lon: preferredLon || 0, state: '' };
  };

  const [selected, setSelected] = useState<CityOption | null>(() => resolveCity());
  const [profileHint, setProfileHint] = useState<string | null>(null);

  // Always follow Settings / farm profile city + coordinates
  useEffect(() => {
    let cancelled = false;
    const next = resolveCity();
    if (!next) {
      setProfileHint('Set City + coordinates in Settings → Save to load live weather for your farm.');
      setSelected(null);
      return;
    }
    setProfileHint(null);

    const apply = (city: CityOption) => {
      if (cancelled) return;
      setSelected((prev) => {
        if (
          prev &&
          prev.name.toLowerCase() === city.name.toLowerCase() &&
          Math.abs(prev.lat - city.lat) < 1e-6 &&
          Math.abs(prev.lon - city.lon) < 1e-6
        ) {
          return prev;
        }
        return city;
      });
    };

    apply(next);

    // If Settings only has a city name (or 0,0 coords), geocode so weather is not stuck on Solapur
    const needsGeo = !next.lat || !next.lon;
    if (needsGeo && next.name) {
      void (async () => {
        try {
          const geo = await geocodeCity(next.name);
          if (geo && !cancelled) {
            apply({
              name: geo.name || next.name,
              state: geo.state || next.state || '',
              lat: geo.lat,
              lon: geo.lon,
            });
          }
        } catch {
          /* ignore */
        }
      })();
    }

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preferredCity, preferredLat, preferredLon]);
  const [weather, setWeather] = useState<WeatherResponse | null>(null);
  const [hourly, setHourly] = useState<HourlyPoint[]>([]);
  const [forecast, setForecast] = useState<ForecastDay[]>([]);
  const [historicalSeries, setHistoricalSeries] = useState<{ day: string; temp: number; rain: number; humidity: number }[]>([]);
  const [cityTemps, setCityTemps] = useState<Record<string, { temp: number; condition: string }>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('live');
  const [mapMetric, setMapMetric] = useState<MapMetric>('Temperature');
  const [showAgro, setShowAgro] = useState(false);

  const loadAll = useCallback(async (city: CityOption) => {
    setLoading(true);
    setError(null);
    try {
      const [curr, hour, week, hist] = await Promise.all([
        fetchCurrentWeather(city),
        fetchHourlyTrends(city.lat, city.lon),
        fetch7DayForecast(city.lat, city.lon),
        fetchHistoricalDaily(city.lat, city.lon).catch(() => [] as { day: string; temp: number; rain: number; humidity: number }[]),
      ]);
      if (!curr.city) curr.city = city.name;
      setWeather(curr);
      setHourly(hour);
      setForecast(week);
      setHistoricalSeries(hist);
      setLastUpdated(new Date());
      // Push live data to Weather Summary (right panel)
      const cw = curr.weather;
      const dayMax = week.length ? Math.max(...week.map((d) => d.tempMax)) : undefined;
      const dayMin = week.length ? Math.min(...week.map((d) => d.tempMin)) : undefined;
      const fromBackend = !String(curr.source || '').toLowerCase().includes('fallback');
      const rawDate = String(curr.date || '');
      let observationDate: string | undefined;
      let observationDateIso: string | undefined;
      if (rawDate) {
        const digits = rawDate.replace(/\D/g, '');
        if (digits.length >= 8) {
          const y = digits.slice(0, 4);
          const m = digits.slice(4, 6);
          const d = digits.slice(6, 8);
          observationDateIso = `${y}-${m}-${d}`;
          const dt = new Date(`${observationDateIso}T12:00:00`);
          if (!Number.isNaN(dt.getTime())) {
            observationDate = dt.toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            });
          }
        }
      }
      if (!observationDate) {
        observationDate = new Date().toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        });
      }
      onLiveWeather?.({
        city: curr.city || city.name,
        temperature: Math.round(cw.temperature_c),
        humidity: Math.round(cw.humidity_pct),
        rainfall: Math.round(cw.rainfall_mm * 10) / 10,
        windKmh: Math.round(cw.wind_speed_m_s * 3.6),
        condition: cw.condition || conditionFromWeather(cw.temperature_c, cw.rainfall_mm),
        minTemp: dayMin,
        maxTemp: dayMax,
        source: curr.source,
        isBackend: fromBackend,
        observationDate,
        observationDateIso,
        utcHour: curr.utc_hour,
      } as LiveWeatherSummary);
    } catch (e: any) {
      setError(e?.message || 'Failed to fetch weather');
    } finally {
      setLoading(false);
    }
  }, [onLiveWeather]);

  useEffect(() => {
    POPULAR_CITIES.forEach(async (c) => {
      try {
        const w = await fetchCurrentWeather(c);
        setCityTemps((prev) => ({
          ...prev,
          [c.name]: { temp: Math.round(w.weather.temperature_c), condition: w.weather.condition || 'Partly Cloudy' },
        }));
      } catch { /* ignore */ }
    });
  }, []);

  useEffect(() => {
    if (!selected || !selected.name) return;
    // Skip fetch until we have usable coordinates
    if (!selected.lat && !selected.lon) {
      setProfileHint('City set but coordinates missing — enter lat/lon in Settings and Save.');
      return;
    }
    loadAll(selected);
    const id = setInterval(() => loadAll(selected), 10 * 60 * 1000);
    return () => clearInterval(id);
  }, [selected, loadAll]);

  const handleSearch = async () => {
    if (!search.trim()) return;
    const geo = await geocodeCity(search.trim());
    if (!geo) {
      setError(`City "${search}" not found in India`);
      return;
    }
    setSelected({ name: geo.name, state: geo.state || '', lat: geo.lat, lon: geo.lon });
    setSearch('');
  };

  const w = weather?.weather;
  const windKmh = w ? (w.wind_speed_m_s * 3.6).toFixed(0) : '—';
  const updatedStr = lastUpdated
    ? lastUpdated.toLocaleString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true,
      }) + ' IST'
    : '—';
  /** Active profile city (null until Settings has city + coords) */
  const city = selected;

  const paramsTable = useMemo(() => {
    if (!w) return [];
    const temps = hourly.map((h) => h.temp);
    const hums = hourly.map((h) => h.humidity);
    const rains = hourly.map((h) => h.rain);
    const winds = hourly.map((h) => h.wind);
    const solars = hourly.map((h) => h.solar);
    const min = (arr: number[]) => (arr.length ? Math.min(...arr) : 0);
    const max = (arr: number[]) => (arr.length ? Math.max(...arr) : 0);
    return [
      { param: 'Temperature', current: w.temperature_c.toFixed(1), min: min(temps).toFixed(1), max: max(temps).toFixed(1), unit: '°C', status: tempStatus(w.temperature_c) },
      { param: 'Humidity', current: w.humidity_pct.toFixed(0), min: min(hums).toFixed(0), max: max(hums).toFixed(0), unit: '%', status: humidityStatus(w.humidity_pct) },
      { param: 'Rainfall', current: w.rainfall_mm.toFixed(1), min: min(rains).toFixed(1), max: max(rains).toFixed(1), unit: 'mm', status: rainStatus(w.rainfall_mm) },
      { param: 'Wind Speed', current: windKmh, min: min(winds).toFixed(0), max: max(winds).toFixed(0), unit: 'km/h', status: windStatus(w.wind_speed_m_s) },
      { param: 'Solar Radiation', current: w.solar_radiation_w_m2.toFixed(0), min: min(solars).toFixed(0), max: max(solars).toFixed(0), unit: 'W/m²', status: solarStatus(w.solar_radiation_w_m2) },
      { param: 'Soil Surface Temp.', current: (w.temperature_c - 1.5).toFixed(1), min: (min(temps) - 2).toFixed(1), max: (max(temps) + 1).toFixed(1), unit: '°C', status: 'Optimal' },
    ];
  }, [w, hourly, windKmh]);

  const agroImpact = useMemo(() => {
    if (!w) return [];
    const rainOk = w.rainfall_mm > 0 && w.rainfall_mm < 15;
    return [
      { label: 'Vine Growth Impact', value: tempStatus(w.temperature_c) === 'Optimal' ? 'Positive' : 'Moderate', note: 'Good conditions for vegetative growth.', color: 'text-emerald-400' },
      { label: 'Disease Risk', value: w.humidity_pct > 80 ? 'Moderate' : 'Low', note: 'Low humidity and good airflow.', color: w.humidity_pct > 80 ? 'text-amber-400' : 'text-emerald-400' },
      { label: 'Irrigation Need', value: rainOk ? 'Not Required' : w.rainfall_mm === 0 ? 'Monitor' : 'Not Required', note: rainOk ? 'Rainfall sufficient for current soil moisture.' : 'Check soil moisture sensors.', color: 'text-emerald-400' },
      { label: 'Nutrient Uptake', value: 'Optimal', note: 'Ideal moisture and temperature range.', color: 'text-emerald-400' },
      { label: 'Expected Yield Impact', value: 'High', note: 'Favorable weather may improve yield by ~8%.', color: 'text-emerald-400' },
    ];
  }, [w]);

  const alerts = useMemo(() => {
    if (!w) return [];
    const list: { type: string; title: string; desc: string; time: string }[] = [];
    if (w.rainfall_mm > 0.5 || (forecast[0] && forecast[0].rain > 5)) {
      list.push({ type: 'warn', title: 'Moderate Rainfall Expected', desc: '5–15 mm rainfall expected in next 24 hours.', time: 'Recent' });
    }
    list.push({ type: 'ok', title: 'Favorable Conditions', desc: 'Ideal weather for vine growth and nutrient uptake.', time: 'Recent' });
    if (w.wind_speed_m_s > 4) {
      list.push({ type: 'info', title: 'Wind Advisory', desc: `Moderate winds from ${w.wind_dir || 'WSW'} at ${windKmh} km/h.`, time: 'Recent' });
    }
    return list;
  }, [w, forecast, windKmh]);


  const radarData = useMemo(() => {
    if (!w) return [];
    return [
      { metric: 'Temp', value: Math.min(100, (w.temperature_c / 45) * 100) },
      { metric: 'Humidity', value: w.humidity_pct },
      { metric: 'Rain', value: Math.min(100, w.rainfall_mm * 10) },
      { metric: 'Wind', value: Math.min(100, w.wind_speed_m_s * 10) },
      { metric: 'Solar', value: Math.min(100, (w.solar_radiation_w_m2 / 1000) * 100) },
    ];
  }, [w]);

  const tooltipStyle = { background: '#0f1722', border: '1px solid #1e2d40', borderRadius: 8, fontSize: 11 };

  /* ─── Shared right sidebar ────────────────────────────────────────────── */
  const RightSidebar = (
    <div className="w-[300px] shrink-0 border-l border-[#1e2d40] bg-[#0b131e] overflow-y-auto p-4 flex flex-col gap-4">
      <div className="bg-[#16202d] rounded-xl border border-[#1e2d40] p-4">
        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">1. Select Location (All India)</h3>
        <div className="flex gap-2 mb-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search city or state…"
            className="flex-1 text-[12px] bg-[#0f1722] border border-[#1e2d40] rounded-lg px-3 py-2 text-slate-200 placeholder:text-slate-600 outline-none focus:border-emerald-500/50"
          />
          <button type="button" onClick={handleSearch} className="p-2 rounded-lg bg-[#0f1722] border border-[#1e2d40] text-slate-400 hover:text-emerald-400">
            <Search size={16} />
          </button>
        </div>
        <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
          {/* Profile city first when not already in the quick list */}
          {city &&
            !POPULAR_CITIES.some((c) => c.name.toLowerCase() === city.name.toLowerCase()) && (
              <button
                type="button"
                onClick={() => setSelected(city)}
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition bg-emerald-900/25 border border-emerald-500/40 mb-1"
              >
                <MapPin size={14} className="text-emerald-400" />
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-medium truncate text-emerald-300">
                    {city.name}{city.state ? `, ${city.state}` : ''} · Profile
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {city.lat.toFixed(2)}° N, {city.lon.toFixed(2)}° E
                  </div>
                </div>
              </button>
            )}
          {POPULAR_CITIES.map((c) => {
            const on = Boolean(city && city.name.toLowerCase() === c.name.toLowerCase());
            const t = cityTemps[c.name];
            return (
              <button
                key={c.name}
                type="button"
                onClick={() => setSelected(c)}
                className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition ${
                  on ? 'bg-emerald-900/25 border border-emerald-500/40' : 'border border-transparent hover:bg-[#0f1722]'
                }`}
              >
                <MapPin size={14} className={on ? 'text-emerald-400' : 'text-slate-500'} />
                <div className="flex-1 min-w-0">
                  <div className={`text-[12px] font-medium truncate ${on ? 'text-emerald-300' : 'text-slate-300'}`}>
                    {c.name}, {c.state}
                  </div>
                  <div className="text-[10px] text-slate-500">{c.lat.toFixed(2)}° N, {c.lon.toFixed(2)}° E</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[13px] font-bold text-white">{t ? `${t.temp}°C` : '—'}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-[#16202d] rounded-xl border border-[#1e2d40] p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">2. Current Weather (Live)</h3>
          <span className="flex items-center gap-1 text-[9px] text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live
          </span>
        </div>
        <div className="flex items-center gap-2 text-[12px] text-slate-300 mb-1">
          <MapPin size={14} className="text-emerald-400" />
          {(city || selected)?.name || '—'}, {(city || selected)?.state || 'India'}
        </div>
        <div className="text-[10px] text-slate-500 mb-4">{((city || selected)?.lat ?? 0).toFixed(2)}° N, {((city || selected)?.lon ?? 0).toFixed(2)}° E</div>
        <div className="flex items-center gap-4 mb-4">
          <WeatherIcon type={w ? iconForCondition(w.condition || '') : 'partly'} size={42} />
          <div>
            <div className="text-3xl font-bold text-white leading-none">{w ? `${w.temperature_c.toFixed(1)}°C` : '—'}</div>
            <div className="text-[12px] text-slate-400 mt-1">{w?.condition || '—'}</div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-[11px]">
          {[
            ['Humidity', w ? `${w.humidity_pct.toFixed(0)}%` : '—', ''],
            ['Wind', `${windKmh} km/h`, w?.wind_dir || ''],
            ['Rainfall', w ? `${w.rainfall_mm.toFixed(1)} mm` : '—', '1h'],
            ['Pressure', w?.pressure ? `${Math.round(w.pressure)} hPa` : '—', ''],
            ['Visibility', w?.visibility != null ? `${w.visibility} km` : '—', ''],
            ['UV Index', w?.uv_index != null ? String(Math.round(w.uv_index)) : '—', ''],
          ].map(([l, v, s]) => (
            <div key={l as string} className="bg-[#0f1722] rounded-lg p-2 text-center">
              <div className="text-slate-500 text-[10px]">{l}</div>
              <div className="text-white font-semibold">{v}</div>
              {s && <div className="text-slate-600 text-[9px]">{s}</div>}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-[#16202d] rounded-xl border border-[#1e2d40] p-4">
        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">3. Data Source Information</h3>
        <div className="space-y-2.5 text-[12px]">
          <div className="flex justify-between gap-2">
            <span className="text-slate-400">Active Source</span>
            <span className="text-slate-200 text-right truncate">{weather?.source || '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Stack</span>
            <span className="text-slate-300 text-[11px]">main → weather_service → nasa</span>
          </div>
          <div className="flex justify-between pt-2 border-t border-[#1e2d40]">
            <span className="text-slate-400">Last Sync</span>
            <span className="text-slate-300 text-[11px]">{updatedStr}</span>
          </div>
        </div>
      </div>

      <div className="bg-[#16202d] rounded-xl border border-[#1e2d40] p-4">
        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">4. Weather Alerts</h3>
        <div className="space-y-3">
          {alerts.map((a, i) => (
            <div key={i} className="flex gap-2 text-[12px]">
              {a.type === 'warn' && <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />}
              {a.type === 'ok' && <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />}
              {a.type === 'info' && <Info size={16} className="text-sky-400 shrink-0 mt-0.5" />}
              <div>
                <div className="font-semibold text-slate-200">{a.title}</div>
                <div className="text-slate-500 text-[11px] leading-snug">{a.desc}</div>
              </div>
            </div>
          ))}
          {!alerts.length && <div className="text-[12px] text-slate-500">No active alerts</div>}
        </div>
      </div>
    </div>
  );

  if (!city) {
    return (
      <div className="flex-1 overflow-y-auto p-6 bg-[#0b131e] flex items-center justify-center">
        <div className="max-w-md w-full rounded-2xl border border-sky-500/25 bg-[#0c121c] p-6 text-center space-y-3">
          <div className="text-3xl">📍</div>
          <h2 className="text-lg font-bold text-white">No farm city yet</h2>
          <p className="text-[12px] text-slate-400 leading-relaxed">
            Live weather follows the city you enter when creating / editing your farm profile.
          </p>
          <p className="text-[12px] text-sky-300/90">
            Open <strong className="text-white">Settings</strong> → enter <strong className="text-white">City</strong>,
            latitude &amp; longitude → <strong className="text-white">Save &amp; refresh APIs</strong>.
          </p>
          {profileHint && <p className="text-[11px] text-slate-500">{profileHint}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#0b131e] overflow-hidden">
      {/* Tabs */}
      <div className="shrink-0 border-b border-[#1e2d40] bg-[#0f1722] px-4 flex items-center gap-1 overflow-x-auto">
        {([
          { id: 'live', label: 'Live Weather' },
          { id: 'forecast', label: '7-Day Forecast' },
          { id: 'historical', label: 'Historical Data' },
          { id: 'maps', label: 'Weather Maps' },
          { id: 'extreme', label: 'Extreme Events' },
          { id: 'api', label: 'API & Data Sources' },
        ] as { id: TabId; label: string }[]).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => { setActiveTab(t.id); setShowAgro(false); }}
            className={`px-4 py-3 text-[12px] font-semibold whitespace-nowrap border-b-2 transition ${
              activeTab === t.id
                ? 'border-emerald-500 text-emerald-400 bg-emerald-900/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 flex min-h-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-5 min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-base font-bold text-white tracking-wide">
                  {activeTab === 'live' && 'LIVE WEATHER OVERVIEW'}
                  {activeTab === 'forecast' && '7-DAY WEATHER FORECAST'}
                  {activeTab === 'historical' && 'HISTORICAL WEATHER DATA'}
                  {activeTab === 'maps' && 'INDIA WEATHER MAPS'}
                  {activeTab === 'extreme' && 'EXTREME WEATHER EVENTS'}
                  {activeTab === 'api' && 'API & DATA SOURCES'}
                </h2>
                <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> LIVE
                </span>
              </div>
              <div className="text-[11px] text-slate-500">
                Source: <span className="text-emerald-400">{weather?.source || '—'}</span> · Updated: {updatedStr}
              </div>
            </div>
            <button
              type="button"
              onClick={() => loadAll(selected)}
              disabled={loading}
              className="flex items-center gap-2 text-[12px] px-3 py-2 rounded-lg border border-[#1e2d40] bg-[#16202d] text-slate-300 hover:text-emerald-300 disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Refresh Now
            </button>
          </div>

          {error && (
            <div className="mb-4 text-xs text-rose-400 bg-rose-900/20 border border-rose-500/30 rounded-lg px-4 py-3">{error}</div>
          )}

          {/* ═══════════ LIVE TAB ═══════════ */}
          {activeTab === 'live' && showAgro && (
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => setShowAgro(false)}
                className="text-[12px] text-emerald-400 hover:underline"
              >
                ← Back to live weather overview
              </button>

              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h2 className="text-base font-bold text-white">DETAILED AGRO ADVISORY</h2>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {(city || selected)?.name || '—'}, {(city || selected)?.state || 'India'} · Based on live hybrid weather (Open-Meteo / NASA POWER)
                  </div>
                </div>
                <span className="text-[11px] text-slate-500">Updated: {updatedStr}</span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { l: 'Temperature', v: w ? `${w.temperature_c.toFixed(1)}°C` : '—', s: w ? tempStatus(w.temperature_c) : '—' },
                  { l: 'Humidity', v: w ? `${w.humidity_pct.toFixed(0)}%` : '—', s: w ? humidityStatus(w.humidity_pct) : '—' },
                  { l: 'Rain (1h)', v: w ? `${w.rainfall_mm.toFixed(1)} mm` : '—', s: w ? rainStatus(w.rainfall_mm) : '—' },
                  { l: 'Wind', v: w ? `${windKmh} km/h` : '—', s: w ? windStatus(w.wind_speed_m_s) : '—' },
                ].map((c) => (
                  <div key={c.l} className="bg-[#16202d] rounded-xl border border-[#1e2d40] p-3">
                    <div className="text-[10px] text-slate-400">{c.l}</div>
                    <div className="text-lg font-bold text-white mt-1">{c.v}</div>
                    <div className={`text-[11px] font-semibold ${statusColor(c.s)}`}>{c.s}</div>
                  </div>
                ))}
              </div>

              <div className="bg-[#16202d] rounded-xl border border-[#1e2d40] p-4">
                <h3 className="text-sm font-bold text-white mb-3">Crop impact summary</h3>
                <div className="space-y-2">
                  {agroImpact.map((a) => (
                    <div key={a.label} className="flex items-start gap-3 text-[12px] border-b border-[#1e2d40]/50 pb-2.5">
                      <div className="w-[140px] shrink-0 text-slate-400">{a.label}</div>
                      <div className={`w-28 shrink-0 font-semibold ${a.color}`}>{a.value}</div>
                      <div className="text-slate-500 flex-1">{a.note}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#16202d] rounded-xl border border-[#1e2d40] p-4 space-y-2 text-[12px]">
                  <h3 className="text-xs font-bold text-white mb-2">Irrigation & water</h3>
                  <p className="text-slate-400 leading-relaxed">
                    {w && w.rainfall_mm > 2
                      ? 'Recent rain reduces immediate irrigation need. Check soil sensors before the next drip cycle.'
                      : w && w.rainfall_mm > 0
                        ? 'Light rain recorded — partial credit toward daily water requirement.'
                        : 'No significant rain in the last hour. Maintain scheduled drip if root-zone moisture is below target.'}
                  </p>
                  <ul className="text-slate-400 list-disc list-inside space-y-1">
                    <li>Prefer early-morning irrigation to cut evaporation loss</li>
                    <li>Skip or shorten runs if 7-day rain exceeds ~20 mm</li>
                    <li>Align fertigation with the middle third of the drip set</li>
                  </ul>
                </div>
                <div className="bg-[#16202d] rounded-xl border border-[#1e2d40] p-4 space-y-2 text-[12px]">
                  <h3 className="text-xs font-bold text-white mb-2">Disease & canopy</h3>
                  <p className="text-slate-400 leading-relaxed">
                    {w && w.humidity_pct > 80
                      ? 'High humidity raises fungal risk (downy / powdery). Improve airflow and avoid late-evening sprays that stay wet overnight.'
                      : 'Humidity is moderate — disease pressure from leaf wetness is lower today.'}
                  </p>
                  <ul className="text-slate-400 list-disc list-inside space-y-1">
                    <li>Scout inner canopy after multi-day humid spells</li>
                    <li>Avoid dense nitrogen pushes when humidity stays high</li>
                    <li>Wind helps dry leaves when speeds stay above ~8 km/h</li>
                  </ul>
                </div>
              </div>

              <div className="bg-[#16202d] rounded-xl border border-[#1e2d40] p-4">
                <h3 className="text-xs font-bold text-white mb-3">7-day weather outlook for field work</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-[12px]">
                    <thead>
                      <tr className="text-slate-500 border-b border-[#1e2d40]">
                        <th className="text-left py-2">Day</th>
                        <th className="text-right py-2">Max / Min</th>
                        <th className="text-right py-2">Rain</th>
                        <th className="text-right py-2">Humidity</th>
                        <th className="text-left py-2 pl-3">Field note</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(forecast.length ? forecast : []).map((d, i) => {
                        const note =
                          d.rain >= 15
                            ? 'Delay sprays & heavy traffic'
                            : d.tempMax >= 36
                              ? 'Heat stress — irrigate early'
                              : d.humidity >= 80
                                ? 'Watch disease; keep airflow'
                                : 'Favourable for field operations';
                        return (
                          <tr key={i} className="border-b border-[#1e2d40]/50">
                            <td className="py-2 text-slate-300">{d.label}</td>
                            <td className="py-2 text-right text-white">{d.tempMax}° / {d.tempMin}°</td>
                            <td className="py-2 text-right text-sky-300">{d.rain} mm</td>
                            <td className="py-2 text-right text-cyan-300">{d.humidity}%</td>
                            <td className="py-2 text-slate-400 pl-3">{note}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {!forecast.length && <div className="text-slate-500 text-sm py-4">Loading forecast…</div>}
                </div>
              </div>

              <div className="bg-[#16202d] rounded-xl border border-[#1e2d40] p-4">
                <h3 className="text-xs font-bold text-white mb-3">Action checklist</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[12px]">
                  {[
                    { t: 'Irrigation', d: w && w.rainfall_mm > 5 ? 'Hold or reduce today' : 'Follow soil-moisture schedule' },
                    { t: 'Nutrition', d: 'Avoid heavy N if heat + high humidity' },
                    { t: 'Plant protection', d: w && w.humidity_pct > 80 ? 'Prioritize preventive spray window' : 'Routine scouting sufficient' },
                    { t: 'Labour / operations', d: forecast[0]?.rain >= 10 ? 'Plan indoor tasks if rain builds' : 'Outdoor work feasible' },
                  ].map((a) => (
                    <div key={a.t} className="bg-[#0f1722] rounded-lg border border-[#1e2d40] p-3">
                      <div className="text-emerald-400 font-semibold">{a.t}</div>
                      <div className="text-slate-400 mt-1">{a.d}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="text-[11px] text-slate-500 flex items-center gap-2">
                Advisory uses live weather for {selected.name} · Sources: {weather?.source || 'Hybrid API'}
              </div>
            </div>
          )}

          {activeTab === 'live' && !showAgro && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
                {[
                  { icon: <Thermometer size={18} className="text-rose-400" />, label: 'Temperature', value: w ? `${w.temperature_c.toFixed(1)}°C` : '—', sub: w?.feels_like != null ? `Feels like ${w.feels_like.toFixed(1)}°C` : '', status: w ? tempStatus(w.temperature_c) : '' },
                  { icon: <Droplets size={18} className="text-cyan-400" />, label: 'Humidity', value: w ? `${w.humidity_pct.toFixed(0)}%` : '—', sub: w?.dew_point != null ? `Dew Point ${w.dew_point.toFixed(1)}°C` : '', status: w ? humidityStatus(w.humidity_pct) : '' },
                  { icon: <CloudRain size={18} className="text-blue-400" />, label: 'Rainfall', value: w ? `${w.rainfall_mm.toFixed(1)} mm` : '—', sub: 'Last 1 Hour', status: w ? rainStatus(w.rainfall_mm) : '' },
                  { icon: <Wind size={18} className="text-slate-300" />, label: 'Wind Speed', value: w ? `${windKmh} km/h` : '—', sub: w?.wind_dir || '', status: w ? windStatus(w.wind_speed_m_s) : '' },
                  { icon: <Sun size={18} className="text-amber-400" />, label: 'Solar Radiation', value: w ? `${w.solar_radiation_w_m2.toFixed(0)} W/m²` : '—', sub: 'All Sky', status: w ? solarStatus(w.solar_radiation_w_m2) : '' },
                ].map((m) => (
                  <div key={m.label} className="bg-[#16202d] rounded-xl border border-[#1e2d40] p-4 flex flex-col gap-1.5 min-h-[110px]">
                    <div className="flex items-center gap-2 text-[11px] text-slate-400">{m.icon}{m.label}</div>
                    <div className="text-xl font-bold text-white">{m.value}</div>
                    {m.sub && <div className="text-[11px] text-slate-500">{m.sub}</div>}
                    {m.status && <div className={`text-[11px] font-semibold mt-auto ${statusColor(m.status)}`}>{m.status}</div>}
                  </div>
                ))}
              </div>

              <div className="bg-[#16202d] rounded-xl border border-[#1e2d40] p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-white">Weather Trends (24 Hours)</h3>
                  <span className="text-[11px] text-slate-500 border border-[#1e2d40] rounded px-2 py-1">24 Hours</span>
                </div>
                <div className="h-[280px] w-full">
                  {hourly.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={hourly} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e2d40" />
                        <XAxis dataKey="time" tick={{ fill: '#94a3b8', fontSize: 10 }} interval="preserveStartEnd" />
                        <YAxis yAxisId="left" tick={{ fill: '#94a3b8', fontSize: 10 }} domain={[0, 100]} />
                        <YAxis yAxisId="right" orientation="right" tick={{ fill: '#94a3b8', fontSize: 10 }} domain={[0, 1000]} />
                        <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: '#e2e8f0' }} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Line yAxisId="left" type="monotone" dataKey="temp" name="Temperature (°C)" stroke="#f59e0b" strokeWidth={2.5} dot={false} />
                        <Line yAxisId="left" type="monotone" dataKey="humidity" name="Humidity (%)" stroke="#38bdf8" strokeWidth={2} dot={false} />
                        <Bar yAxisId="left" dataKey="rain" name="Rainfall (mm)" fill="#3b82f6" opacity={0.75} />
                        <Line yAxisId="left" type="monotone" dataKey="wind" name="Wind (km/h)" stroke="#34d399" strokeWidth={2} dot={false} />
                        <Line yAxisId="right" type="monotone" dataKey="solar" name="Solar (W/m²)" stroke="#eab308" strokeWidth={2} dot={false} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-500 text-sm">{loading ? 'Loading trends…' : 'No hourly data'}</div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                <div className="bg-[#16202d] rounded-xl border border-[#1e2d40] p-4">
                  <h3 className="text-sm font-bold text-white mb-3">Weather Parameters</h3>
                  <table className="w-full text-[12px]">
                    <thead>
                      <tr className="text-slate-500 border-b border-[#1e2d40]">
                        <th className="text-left py-2 font-medium">Parameter</th>
                        <th className="text-right py-2">Current</th>
                        <th className="text-right py-2">Min 24h</th>
                        <th className="text-right py-2">Max 24h</th>
                        <th className="text-right py-2">Unit</th>
                        <th className="text-right py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paramsTable.map((r) => (
                        <tr key={r.param} className="border-b border-[#1e2d40]/50">
                          <td className="py-2.5 text-slate-300">{r.param}</td>
                          <td className="py-2.5 text-right text-white font-medium">{r.current}</td>
                          <td className="py-2.5 text-right text-slate-400">{r.min}</td>
                          <td className="py-2.5 text-right text-slate-400">{r.max}</td>
                          <td className="py-2.5 text-right text-slate-500">{r.unit}</td>
                          <td className={`py-2.5 text-right font-semibold ${statusColor(r.status)}`}>{r.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="bg-[#16202d] rounded-xl border border-[#1e2d40] p-4">
                  <h3 className="text-sm font-bold text-white mb-3">Agricultural Impact & Recommendations</h3>
                  <div className="space-y-3">
                    {agroImpact.map((a) => (
                      <div key={a.label} className="flex items-start gap-3 text-[12px] border-b border-[#1e2d40]/50 pb-2.5">
                        <div className="w-[130px] shrink-0 text-slate-400">{a.label}</div>
                        <div className={`w-24 shrink-0 font-semibold ${a.color}`}>{a.value}</div>
                        <div className="text-slate-500 flex-1">{a.note}</div>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAgro(true)}
                    className="mt-4 w-full py-2.5 rounded-lg bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 text-[12px] font-bold hover:bg-emerald-600/30"
                  >
                    View Detailed Agro Advisory →
                  </button>
                </div>
              </div>

              <div className="bg-[#16202d] rounded-xl border border-[#1e2d40] p-4">
                <h3 className="text-sm font-bold text-white mb-3">Climate Balance (Radar)</h3>
                <div className="h-[260px]">
                  {radarData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="#1e2d40" />
                        <PolarAngleAxis dataKey="metric" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 9 }} />
                        <Radar name="Current" dataKey="value" stroke="#10b981" fill="#10b981" fillOpacity={0.35} />
                        <Tooltip contentStyle={tooltipStyle} />
                      </RadarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-500 text-sm">Loading…</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ═══════════ FORECAST TAB ═══════════ */}
          {activeTab === 'forecast' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                {(forecast.length ? forecast : Array(7).fill(null)).map((d, i) => (
                  <div key={i} className="bg-[#16202d] rounded-xl border border-[#1e2d40] p-4 flex flex-col items-center text-center min-h-[160px]">
                    {d ? (
                      <>
                        <div className="text-[12px] text-slate-400 font-medium">{d.label}</div>
                        <div className="my-3"><WeatherIcon type={d.icon} size={28} /></div>
                        <div className="text-lg font-bold text-white">{d.tempMax}° <span className="text-slate-500 font-normal text-sm">{d.tempMin}°</span></div>
                        <div className="text-[12px] text-blue-400 mt-2">{d.rain} mm rain</div>
                        <div className="text-[12px] text-cyan-400/80 mt-1">{d.humidity}% RH</div>
                        <div className="text-[11px] text-slate-500 mt-2">{d.condition}</div>
                      </>
                    ) : (
                      <div className="m-auto text-slate-600">…</div>
                    )}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                <div className="bg-[#16202d] rounded-xl border border-[#1e2d40] p-4">
                  <h3 className="text-sm font-bold text-white mb-3">Temperature Range (°C)</h3>
                  <div className="h-[260px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={forecast} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e2d40" />
                        <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                        <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Area type="monotone" dataKey="tempMax" name="Max" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.25} />
                        <Area type="monotone" dataKey="tempMin" name="Min" stroke="#38bdf8" fill="#38bdf8" fillOpacity={0.2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="bg-[#16202d] rounded-xl border border-[#1e2d40] p-4">
                  <h3 className="text-sm font-bold text-white mb-3">Rainfall Forecast (mm)</h3>
                  <div className="h-[260px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={forecast} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e2d40" />
                        <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                        <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Bar dataKey="rain" name="Rain (mm)" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════ HISTORICAL TAB ═══════════ */}
          {activeTab === 'historical' && (
            <div className="space-y-5">
              <p className="text-[12px] text-slate-400">
                Last 14 days of observed data for <span className="text-emerald-400 font-medium">{selected.name}</span> ({selected.lat.toFixed(2)}°N, {selected.lon.toFixed(2)}°E) via Open-Meteo. Changes when you select another city.
              </p>
              <div className="bg-[#16202d] rounded-xl border border-[#1e2d40] p-4">
                <h3 className="text-sm font-bold text-white mb-3">Temperature & Humidity History</h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={historicalSeries}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e2d40" />
                      <XAxis dataKey="day" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                      <YAxis yAxisId="l" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                      <YAxis yAxisId="r" orientation="right" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend />
                      <Line yAxisId="l" type="monotone" dataKey="temp" name="Temp °C" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 3 }} />
                      <Line yAxisId="r" type="monotone" dataKey="humidity" name="Humidity %" stroke="#38bdf8" strokeWidth={2} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="bg-[#16202d] rounded-xl border border-[#1e2d40] p-4">
                <h3 className="text-sm font-bold text-white mb-3">Rainfall History (mm)</h3>
                <div className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={historicalSeries}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e2d40" />
                      <XAxis dataKey="day" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                      <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="rain" name="Rain mm" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════ MAPS TAB ═══════════ */}
          {activeTab === 'maps' && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-[12px] text-slate-400">Layer:</span>
                {(['Temperature', 'Rainfall', 'Humidity', 'Wind'] as MapMetric[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMapMetric(m)}
                    className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold border transition ${
                      mapMetric === m
                        ? 'bg-emerald-900/40 border-emerald-500/50 text-emerald-300'
                        : 'bg-[#16202d] border-[#1e2d40] text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
              <div className="bg-[#16202d] rounded-xl border border-[#1e2d40] p-4">
                <h3 className="text-sm font-bold text-white mb-3">India — {mapMetric} Map</h3>
                <IndiaWeatherMap metric={mapMetric} selected={selected} cityTemps={cityTemps} current={w} height={420} />
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {(['Temperature', 'Rainfall', 'Humidity', 'Wind'] as MapMetric[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMapMetric(m)}
                    className={`bg-[#16202d] rounded-xl border p-3 text-left transition ${
                      mapMetric === m ? 'border-emerald-500/50' : 'border-[#1e2d40] hover:border-slate-600'
                    }`}
                  >
                    <div className="text-[11px] text-slate-400 mb-2">{m}</div>
                    <IndiaWeatherMap metric={m} selected={selected} cityTemps={cityTemps} current={w} height={140} showAllLabels={false} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ═══════════ EXTREME TAB ═══════════ */}
          {activeTab === 'extreme' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  {
                    title: 'Heat Stress Risk',
                    level: w && w.temperature_c > 36 ? 'High' : w && w.temperature_c > 32 ? 'Moderate' : 'Low',
                    color: w && w.temperature_c > 36 ? 'text-rose-400' : w && w.temperature_c > 32 ? 'text-amber-400' : 'text-emerald-400',
                    bar: w ? Math.min(100, (w.temperature_c / 45) * 100) : 0,
                    desc: 'Vine stress rises sharply above 35°C. Monitor canopy temperature and irrigation.',
                  },
                  {
                    title: 'Heavy Rain Risk',
                    level: forecast.some((f) => f.rain > 20) ? 'Elevated' : forecast.some((f) => f.rain > 10) ? 'Watch' : 'Low',
                    color: forecast.some((f) => f.rain > 20) ? 'text-amber-400' : 'text-emerald-400',
                    bar: Math.min(100, Math.max(...(forecast.map((f) => f.rain).concat([0]))) * 4),
                    desc: '7-day scan for daily totals above 20 mm that can delay sprays and increase disease.',
                  },
                  {
                    title: 'Wind Damage Risk',
                    level: w && w.wind_speed_m_s > 12 ? 'Watch' : w && w.wind_speed_m_s > 8 ? 'Moderate' : 'Calm',
                    color: w && w.wind_speed_m_s > 12 ? 'text-amber-400' : 'text-emerald-400',
                    bar: w ? Math.min(100, w.wind_speed_m_s * 6) : 0,
                    desc: 'Sustained winds above ~40 km/h can stress trellis systems and young shoots.',
                  },
                ].map((c) => (
                  <div key={c.title} className="bg-[#16202d] rounded-xl border border-[#1e2d40] p-5">
                    <div className="text-[12px] text-slate-400 mb-2">{c.title}</div>
                    <div className={`text-2xl font-bold ${c.color}`}>{c.level}</div>
                    <div className="mt-3 h-2 rounded-full bg-[#0f1722] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-amber-400 to-rose-500 transition-all"
                        style={{ width: `${c.bar}%` }}
                      />
                    </div>
                    <p className="text-[12px] text-slate-500 mt-3 leading-relaxed">{c.desc}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                <div className="bg-[#16202d] rounded-xl border border-[#1e2d40] p-4">
                  <h3 className="text-sm font-bold text-white mb-3">7-Day Extreme Rain Potential</h3>
                  <div className="h-[240px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={forecast.map((f) => ({ ...f, threshold: 20 }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e2d40" />
                        <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                        <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Bar dataKey="rain" name="Rain (mm)" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                        <Line type="monotone" dataKey="threshold" name="Risk line 20mm" stroke="#f43f5e" strokeDasharray="4 4" dot={false} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="bg-[#16202d] rounded-xl border border-[#1e2d40] p-4">
                  <h3 className="text-sm font-bold text-white mb-3">Heat vs Humidity (Disease Window)</h3>
                  <div className="h-[240px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={forecast}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e2d40" />
                        <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                        <YAxis yAxisId="l" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                        <YAxis yAxisId="r" orientation="right" tick={{ fill: '#94a3b8', fontSize: 10 }} domain={[0, 100]} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Legend />
                        <Bar yAxisId="l" dataKey="tempMax" name="Max °C" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                        <Line yAxisId="r" type="monotone" dataKey="humidity" name="Humidity %" stroke="#38bdf8" strokeWidth={2} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="bg-[#16202d] rounded-xl border border-[#1e2d40] p-4">
                <h3 className="text-sm font-bold text-white mb-3">Risk Timeline (Next 7 Days)</h3>
                <div className="space-y-3">
                  {forecast.map((f, i) => {
                    const heat = f.tempMax >= 36 ? 'High heat' : f.tempMax >= 33 ? 'Warm' : 'OK';
                    const rain = f.rain >= 20 ? 'Heavy rain' : f.rain >= 8 ? 'Showers' : 'Dry';
                    const heatColor = f.tempMax >= 36 ? 'bg-rose-500/30 text-rose-300' : f.tempMax >= 33 ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300';
                    const rainColor = f.rain >= 20 ? 'bg-blue-500/30 text-blue-300' : f.rain >= 8 ? 'bg-sky-500/20 text-sky-300' : 'bg-slate-700/40 text-slate-400';
                    return (
                      <div key={i} className="flex items-center gap-3 text-[12px]">
                        <div className="w-28 shrink-0 text-slate-400 font-medium">{f.label}</div>
                        <div className="flex-1 h-2 rounded-full bg-[#0f1722] overflow-hidden flex">
                          <div className="h-full bg-amber-500/80" style={{ width: `${Math.min(100, (f.tempMax / 42) * 100)}%` }} />
                        </div>
                        <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${heatColor}`}>{heat}</span>
                        <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${rainColor}`}>{rain}</span>
                        <span className="w-16 text-right text-slate-500">{f.tempMax}° / {f.rain}mm</span>
                      </div>
                    );
                  })}
                  {!forecast.length && <div className="text-slate-500 text-sm">Loading forecast…</div>}
                </div>
              </div>

              <div className="bg-[#16202d] rounded-xl border border-[#1e2d40] p-4">
                <h3 className="text-sm font-bold text-white mb-3">Active Alerts</h3>
                <div className="space-y-3">
                  {alerts.map((a, i) => (
                    <div key={i} className="flex gap-3 p-3 rounded-lg bg-[#0f1722] border border-[#1e2d40]">
                      {a.type === 'warn' && <AlertTriangle className="text-amber-400 shrink-0" size={20} />}
                      {a.type === 'ok' && <CheckCircle2 className="text-emerald-400 shrink-0" size={20} />}
                      {a.type === 'info' && <Info className="text-sky-400 shrink-0" size={20} />}
                      <div>
                        <div className="font-semibold text-slate-200">{a.title}</div>
                        <div className="text-[12px] text-slate-500 mt-0.5">{a.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Current Temp', value: w ? `${w.temperature_c.toFixed(1)}°C` : '—' },
                  { label: 'Max (7d)', value: forecast.length ? `${Math.max(...forecast.map((f) => f.tempMax))}°C` : '—' },
                  { label: 'Peak Rain (7d)', value: forecast.length ? `${Math.max(...forecast.map((f) => f.rain)).toFixed(1)} mm` : '—' },
                  { label: 'Wind Now', value: `${windKmh} km/h` },
                ].map((s) => (
                  <div key={s.label} className="bg-[#0f1722] rounded-xl border border-[#1e2d40] p-4 text-center">
                    <div className="text-[11px] text-slate-500">{s.label}</div>
                    <div className="text-lg font-bold text-white mt-1">{s.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═══════════ API TAB ═══════════ */}
          {activeTab === 'api' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { name: 'Open-Meteo (Live)', role: 'Primary', path: 'weather_service.get_open_meteo_weather', active: weather?.source?.includes('Open-Meteo') },
                  { name: 'NASA POWER (AG)', role: 'Backup', path: 'nasa_api.get_nasa_weather', active: weather?.source?.includes('NASA') },
                  { name: 'Local CSV Dataset', role: 'Fallback', path: 'weather_service.get_local_fallback_weather', active: weather?.source?.includes('CSV') || weather?.source?.includes('Local') },
                ].map((s) => (
                  <div key={s.name} className="bg-[#16202d] rounded-xl border border-[#1e2d40] p-5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] text-slate-500 uppercase tracking-wider">{s.role}</span>
                      <span className={`w-2 h-2 rounded-full ${s.active ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                    </div>
                    <div className="text-sm font-bold text-white">{s.name}</div>
                    <div className="text-[11px] text-slate-500 font-mono mt-2 break-all">{s.path}</div>
                  </div>
                ))}
              </div>
              <div className="bg-[#16202d] rounded-xl border border-[#1e2d40] p-5 space-y-3 text-[13px]">
                <div className="flex justify-between border-b border-[#1e2d40] pb-2">
                  <span className="text-slate-400">FastAPI endpoint</span>
                  <span className="text-emerald-400 font-mono text-[12px]">GET /weather?city=…</span>
                </div>
                <div className="flex justify-between border-b border-[#1e2d40] pb-2">
                  <span className="text-slate-400">Base URL</span>
                  <span className="text-slate-200 font-mono text-[12px]">{WEATHER_API_BASE}</span>
                </div>
                <div className="flex justify-between border-b border-[#1e2d40] pb-2">
                  <span className="text-slate-400">Hybrid order</span>
                  <span className="text-slate-200">Open-Meteo → NASA POWER → CSV</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Active response source</span>
                  <span className="text-emerald-400 font-medium">{weather?.source || '—'}</span>
                </div>
              </div>
              <div className="bg-[#0f1722] rounded-xl border border-[#1e2d40] p-4 font-mono text-[11px] text-slate-400 overflow-x-auto">
                <pre>{JSON.stringify(weather, null, 2) || '// waiting for data…'}</pre>
              </div>
            </div>
          )}

          <div className="text-[11px] text-slate-500 flex items-center gap-2 pt-4 pb-2">
            <Info size={14} />
            Auto-refresh every 10 min · Open-Meteo · NASA POWER (AG) · Local CSV fallback
          </div>
        </div>

        {RightSidebar}
      </div>
    </div>
  );
}
