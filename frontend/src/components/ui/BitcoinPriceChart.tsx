import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Static Bitcoin price data - 10 years (July 2015 - June 2025)
const bitcoinPriceData = [
  { date: '2015-07-01', price: 250.00, event: 'July 2015' },
  { date: '2015-12-01', price: 350.00, event: 'End of 2015' },
  { date: '2016-06-01', price: 550.00, event: 'Mid 2016' },
  { date: '2016-12-01', price: 963.00, event: 'Pre-2017 bull run' },
  { date: '2017-06-01', price: 2450.00, event: '2017 bull run starts' },
  { date: '2017-12-17', price: 19497.40, event: '2017 bull run peak' },
  { date: '2018-06-01', price: 7500.00, event: '2018 decline' },
  { date: '2018-12-15', price: 3226.00, event: '2018 bear market bottom' },
  { date: '2019-06-26', price: 13796.49, event: '2019 recovery' },
  { date: '2019-12-01', price: 7200.00, event: 'End of 2019' },
  { date: '2020-03-13', price: 3850.00, event: 'COVID-19 crash' },
  { date: '2020-06-01', price: 9500.00, event: 'Post-COVID recovery' },
  { date: '2020-12-16', price: 21354.00, event: '2020 bull run' },
  { date: '2021-04-14', price: 64863.10, event: '2021 bull run peak' },
  { date: '2021-07-20', price: 29796.00, event: '2021 correction' },
  { date: '2021-11-10', price: 69000.00, event: 'All-time high' },
  { date: '2022-01-01', price: 47686.00, event: 'Start of 2022' },
  { date: '2022-06-18', price: 17600.00, event: '2022 bear market' },
  { date: '2022-11-21', price: 15482.00, event: 'FTX collapse' },
  { date: '2023-01-01', price: 16547.00, event: '2023 recovery start' },
  { date: '2023-03-10', price: 20137.00, event: 'Banking crisis' },
  { date: '2023-06-01', price: 27221.00, event: 'Mid-2023 rally' },
  { date: '2023-10-01', price: 27463.00, event: 'Pre-ETF anticipation' },
  { date: '2024-01-01', price: 45000.00, event: 'ETF approval anticipation' },
  { date: '2024-03-14', price: 67800.00, event: 'Post-ETF approval' },
  { date: '2024-06-01', price: 68000.00, event: 'Mid-2024' },
  { date: '2024-09-01', price: 65000.00, event: 'Late 2024' },
  { date: '2024-12-01', price: 72000.00, event: 'End of 2024' },
  { date: '2025-01-01', price: 75000.00, event: 'Start of 2025' },
  { date: '2025-03-01', price: 82000.00, event: 'Early 2025 rally' },
  { date: '2025-06-01', price: 85000.00, event: 'Mid-2025 projection' },
  { date: '2025-07-01', price: 107000, event: 'July 2025 actual' },
];

const BitcoinPriceChart: React.FC = () => {
  const chartData = {
    labels: bitcoinPriceData.map(item => {
      const date = new Date(item.date);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short' 
      });
    }),
    datasets: [
      {
        label: 'Bitcoin Price (USD)',
        data: bitcoinPriceData.map(item => item.price),
        borderColor: 'rgb(255, 193, 7)',
        backgroundColor: 'rgba(255, 193, 7, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.2,
        pointRadius: 4,
        pointHoverRadius: 8,
        pointHoverBackgroundColor: 'rgb(255, 193, 7)',
        pointHoverBorderColor: '#fff',
        pointHoverBorderWidth: 2,
        pointBackgroundColor: 'rgb(255, 193, 7)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: 'Bitcoin Price — Last 10 Years',
        color: 'rgb(17, 24, 39)',
        font: {
          size: 16,
          weight: 'bold' as const,
        },
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgb(255, 193, 7)',
        borderWidth: 1,
        callbacks: {
          title: function(context: any) {
            const index = context[0].dataIndex;
            const item = bitcoinPriceData[index];
            return `${item.date} - ${item.event}`;
          },
          label: function(context: any) {
            return `Price: $${context.parsed.y.toLocaleString(undefined, { 
              minimumFractionDigits: 2, 
              maximumFractionDigits: 2 
            })}`;
          },
        },
      },
    },
    scales: {
      x: {
        display: true,
        title: {
          display: false,
        },
        ticks: {
          color: 'rgb(107, 114, 128)',
          maxTicksLimit: 12,
        },
        grid: {
          color: 'rgba(156, 163, 175, 0.1)',
        },
      },
      y: {
        display: true,
        title: {
          display: false,
        },
        min: 0,
        max: 110000,
        ticks: {
          color: 'rgb(107, 114, 128)',
          stepSize: 10000,
          maxTicksLimit: 12,
          callback: function(value: any) {
            return '$' + value.toLocaleString();
          },
        },
        grid: {
          color: 'rgba(156, 163, 175, 0.1)',
        },
      },
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false,
    },
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
      <div style={{ height: 600 }}>
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
};

export default BitcoinPriceChart; 