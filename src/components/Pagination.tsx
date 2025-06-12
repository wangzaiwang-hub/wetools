import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
}

interface PageButtonProps {
  page: number;
  isActive: boolean;
  onClick: () => void;
  disabled: boolean;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  isLoading = false
}) => {
  if (totalPages <= 1) return null;

  // 移除展开状态，只保留弹窗状态
  const [showLeftGoInput, setShowLeftGoInput] = useState(false);
  const [showRightGoInput, setShowRightGoInput] = useState(false);
  const [goToPage, setGoToPage] = useState<string>('');

  // 处理快速跳转
  const handleGoToPage = () => {
    const pageNumber = parseInt(goToPage);
    if (!isNaN(pageNumber) && pageNumber >= 1 && pageNumber <= totalPages) {
      onPageChange(pageNumber);
      resetAllState();
    }
  };

  // 重置所有状态
  const resetAllState = () => {
    setShowLeftGoInput(false);
    setShowRightGoInput(false);
    setGoToPage('');
  };

  // 渲染详细的页码
  const renderPageNumbers = () => {
    const pages = [];
    
    // 始终显示第一页（当当前页不是1时）
    if (currentPage !== 1) {
      pages.push(
        <PageButton 
          key={1} 
          page={1} 
          isActive={false}
          onClick={() => onPageChange(1)} 
          disabled={isLoading}
        />
      );
    }
    
    // 处理省略号逻辑
    if (currentPage > 3) {
      // 当前页距离第一页较远，显示省略号或输入框
      if (showLeftGoInput) {
        // 显示左侧快速跳转输入框
        pages.push(
          <div key="left-go" className="flex items-center bg-white rounded-full shadow-sm overflow-hidden border border-gray-200">
            <span className="px-2 text-gray-600 bg-white">Go</span>
            <input
              type="text"
              value={goToPage}
              onChange={(e) => setGoToPage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleGoToPage()}
              className="w-12 h-10 text-center border-none focus:outline-none focus:ring-0 bg-white"
              placeholder="页码"
              autoFocus
            />
            <button
              onClick={handleGoToPage}
              className="px-3 h-10 bg-blue-50 text-blue-500 hover:bg-blue-100 transition-colors border-l border-gray-200"
            >
              确定
            </button>
          </div>
        );
      } else {
        // 显示可点击的省略号
        pages.push(
          <button 
            key="left-ellipsis" 
            className="flex items-center justify-center w-10 h-10 rounded-full text-gray-500 hover:bg-gray-100"
            onClick={() => {
              setShowRightGoInput(false); // 关闭右侧输入框
              setShowLeftGoInput(true);
            }}
            title="点击跳转到指定页"
          >
            ...
          </button>
        );
      }
    } else if (currentPage === 3) {
      // 当前页是3，显示2
      pages.push(
        <PageButton 
          key={2} 
          page={2} 
          isActive={false}
          onClick={() => onPageChange(2)} 
          disabled={isLoading}
        />
      );
    } else if (currentPage === 2) {
      // 当前页是2，不需要额外处理，因为已经显示了1和2
    }
    
    // 显示当前页（永远显示）
    pages.push(
      <PageButton 
        key={currentPage} 
        page={currentPage} 
        isActive={true}
        onClick={() => onPageChange(currentPage)} 
        disabled={isLoading}
      />
    );
    
    // 显示当前页的后一页（如果有且不是最后一页）
    if (currentPage < totalPages && currentPage !== totalPages - 1) {
      pages.push(
        <PageButton 
          key={currentPage + 1} 
          page={currentPage + 1} 
          isActive={false}
          onClick={() => onPageChange(currentPage + 1)} 
          disabled={isLoading}
        />
      );
    }
    
    // 处理右侧省略号逻辑
    if (currentPage < totalPages - 2) {
      // 当前页距离最后一页较远，显示省略号或输入框
      if (showRightGoInput) {
        // 显示右侧快速跳转输入框
        pages.push(
          <div key="right-go" className="flex items-center bg-white rounded-full shadow-sm overflow-hidden border border-gray-200">
            <span className="px-2 text-gray-600 bg-white">Go</span>
            <input
              type="text"
              value={goToPage}
              onChange={(e) => setGoToPage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleGoToPage()}
              className="w-12 h-10 text-center border-none focus:outline-none focus:ring-0 bg-white"
              placeholder="页码"
              autoFocus
            />
            <button
              onClick={handleGoToPage}
              className="px-3 h-10 bg-blue-50 text-blue-500 hover:bg-blue-100 transition-colors border-l border-gray-200"
            >
              确定
            </button>
          </div>
        );
      } else {
        // 显示可点击的省略号
        pages.push(
          <button 
            key="right-ellipsis" 
            className="flex items-center justify-center w-10 h-10 rounded-full text-gray-500 hover:bg-gray-100"
            onClick={() => {
              setShowLeftGoInput(false); // 关闭左侧输入框
              setShowRightGoInput(true);
            }}
            title="点击跳转到指定页"
          >
            ...
          </button>
        );
      }
    } else if (currentPage === totalPages - 2) {
      // 当前页是倒数第3页，显示倒数第2页
      pages.push(
        <PageButton 
          key={totalPages - 1} 
          page={totalPages - 1} 
          isActive={false}
          onClick={() => onPageChange(totalPages - 1)} 
          disabled={isLoading}
        />
      );
    }
    
    // 显示最后一页（当当前页不是最后一页时）
    if (currentPage !== totalPages && totalPages > 1) {
      pages.push(
        <PageButton 
          key={totalPages} 
          page={totalPages} 
          isActive={false}
          onClick={() => onPageChange(totalPages)} 
          disabled={isLoading}
        />
      );
    }
    
    return pages;
  };

  // 页码按钮组件
  const PageButton: React.FC<PageButtonProps> = ({ page, isActive, onClick, disabled }) => (
    <button
      onClick={() => {
        resetAllState(); // 点击页码时重置所有状态
        onClick();
      }}
      disabled={disabled}
      className={clsx(
        "flex items-center justify-center w-10 h-10 rounded-full",
        "transition-all duration-300",
        isActive ? [
          "bg-gradient-to-r from-blue-500 to-blue-600 text-white",
          "shadow-[0_2px_10px_-3px_rgba(59,130,246,0.3)]",
        ] : [
          "bg-white text-gray-700 hover:bg-blue-50 hover:text-blue-500",
          "shadow-sm hover:shadow"
        ],
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      {page}
    </button>
  );

  return (
    <div className="flex justify-center items-center mt-8 space-x-2 flex-wrap">
      <button
        onClick={() => {
          resetAllState(); // 点击上一页时重置展开状态
          onPageChange(currentPage - 1);
        }}
        disabled={currentPage === 1 || isLoading}
        className={clsx(
          "flex items-center justify-center w-10 h-10 rounded-full",
          "transition-all duration-300",
          (currentPage === 1 || isLoading) ? [
            "bg-gray-100 text-gray-400 cursor-not-allowed"
          ] : [
            "bg-white text-gray-700 hover:bg-blue-50 hover:text-blue-500",
            "shadow-sm hover:shadow"
          ]
        )}
      >
        <ChevronLeft size={20} />
      </button>
      
      {renderPageNumbers()}
      
      <button
        onClick={() => {
          resetAllState(); // 点击下一页时重置展开状态
          onPageChange(currentPage + 1);
        }}
        disabled={currentPage === totalPages || isLoading}
        className={clsx(
          "flex items-center justify-center w-10 h-10 rounded-full",
          "transition-all duration-300",
          (currentPage === totalPages || isLoading) ? [
            "bg-gray-100 text-gray-400 cursor-not-allowed"
          ] : [
            "bg-white text-gray-700 hover:bg-blue-50 hover:text-blue-500",
            "shadow-sm hover:shadow"
          ]
        )}
      >
        <ChevronRight size={20} />
      </button>
    </div>
  );
};

export default Pagination;