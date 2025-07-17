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

// Static Solana price data - April 2020 to July 2025
const solanaPriceData = [
  { date: '2020-04-01', price: 0.77, event: 'Solana mainnet beta launch' },
  { date: '2020-12-01', price: 1.50, event: 'End of 2020' },
  { date: '2021-01-01', price: 1.84, event: 'Start of 2021' },
  { date: '2021-05-01', price: 42.00, event: '2021 bull run' },
  { date: '2021-08-01', price: 36.00, event: 'NFT summer' },
  { date: '2021-11-06', price: 259.96, event: 'All-time high' },
  { date: '2022-01-01', price: 170.00, event: 'Start of 2022' },
  { date: '2022-06-01', price: 40.00, event: '2022 bear market' },
  { date: '2022-11-09', price: 13.50, event: 'FTX collapse' },
  { date: '2023-01-01', price: 10.00, event: '2023 recovery start' },
  { date: '2023-06-01', price: 20.00, event: 'Mid-2023 rally' },
  { date: '2023-12-25', price: 120.00, event: '2023 year-end rally' },
  { date: '2024-01-01', price: 101.00, event: 'Start of 2024' },
  { date: '2024-03-01', price: 140.00, event: 'Early 2024 rally' },
  { date: '2024-06-01', price: 160.00, event: 'Mid-2024' },
  { date: '2024-09-01', price: 150.00, event: 'Late 2024' },
  { date: '2024-12-01', price: 180.00, event: 'End of 2024' },
  { date: '2025-01-01', price: 200.00, event: 'Start of 2025' },
  { date: '2025-03-01', price: 230.00, event: 'Early 2025 rally' },
  { date: '2025-06-01', price: 250.00, event: 'Mid-2025 projection' },
  { date: '2025-07-01', price: 270.00, event: 'July 2025 projection' },
];

const SolanaPriceChart: React.FC = () => {
  const chartData = {
    labels: solanaPriceData.map(item => {
      const date = new Date(item.date);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
      });
    }),
    datasets: [
      {
        label: 'Solana Price (USD)',
        data: solanaPriceData.map(item => item.price),
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.2,
        pointRadius: 4,
        pointHoverRadius: 8,
        pointHoverBackgroundColor: 'rgb(16, 185, 129)',
        pointHoverBorderColor: '#fff',
        pointHoverBorderWidth: 2,
        pointBackgroundColor: 'rgb(16, 185, 129)',
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
        text: 'Solana Price — Since Launch',
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
        borderColor: 'rgb(16, 185, 129)',
        borderWidth: 1,
        callbacks: {
          title: function(context: any) {
            const index = context[0].dataIndex;
            const item = solanaPriceData[index];
            return `${item.date} - ${item.event}`;
          },
          label: function(context: any) {
            return `Price: $${context.parsed.y.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
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
        max: 300,
        ticks: {
          color: 'rgb(107, 114, 128)',
          stepSize: 50,
          maxTicksLimit: 8,
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

export default SolanaPriceChart; 