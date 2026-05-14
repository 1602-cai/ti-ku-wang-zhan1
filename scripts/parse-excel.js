#!/usr/bin/env node
/**
 * Excel题库解析脚本
 * 将Excel文件转换为JSON格式供前端使用
 */

const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

// 题库文件配置
const questionBanks = [
  { id: 'hse', name: 'HSE通用题库（技能）', file: 'HSE通用题库（技能）.xls' },
  { id: 'instrument', name: '仪表维修工专业题库500题（班员）', file: '仪表维修工专业题库500题（班员）.xls' },
  { id: 'process', name: '工艺通用题库（技能）', file: '工艺通用题库（技能）.xls' },
  { id: 'equipment', name: '设备通用题库（技能）', file: '设备通用题库（技能）.xls' }
];

// 解析单个Excel文件
function parseExcelFile(filePath, categoryId) {
  console.log(`正在解析: ${path.basename(filePath)}`);
  
  try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
    
    if (data.length < 2) {
      console.log(`  警告: ${path.basename(filePath)} 数据太少`);
      return [];
    }
    
    // 解析表头，找到关键列
    const headers = data[0].map(h => String(h).trim());
    console.log(`  表头: ${headers.join(', ')}`);
    
    // 尝试找到题目、选项、答案列
    const questionCol = findColumnIndex(headers, ['题目', '问题', '试题', '题干', 'question']);
    const answerCol = findColumnIndex(headers, ['答案', '正确答案', 'answer', '正确']);
    const explanationCol = findColumnIndex(headers, ['解析', '说明', '解释', 'explanation']);

    // 找选项列——优先检测 "选择项" 标记列（该列及后续3列即为 ABCD 选项）
    const optionMarkerCol = findColumnIndex(headers, ['选择项', '选项列']);
    let optionACol, optionBCol, optionCCol, optionDCol;

    if (optionMarkerCol >= 0 && optionMarkerCol + 3 < headers.length) {
      optionACol = optionMarkerCol;
      optionBCol = optionMarkerCol + 1;
      optionCCol = optionMarkerCol + 2;
      optionDCol = optionMarkerCol + 3;
      console.log(`  选项列: 从"选择项"标记检测 A=${optionACol} B=${optionBCol} C=${optionCCol} D=${optionDCol}`);
    } else {
      // 回退：按列名 ABCD 匹配
      optionACol = findColumnIndex(headers, ['A', '选项A', 'A选项']);
      optionBCol = findColumnIndex(headers, ['B', '选项B', 'B选项']);
      optionCCol = findColumnIndex(headers, ['C', '选项C', 'C选项']);
      optionDCol = findColumnIndex(headers, ['D', '选项D', 'D选项']);
    }

    console.log(`  题目列: ${questionCol}, 答案列: ${answerCol}`);
    
    // 解析题目
    const questions = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row[questionCol]) continue;
      
      const questionText = String(row[questionCol]).trim();
      if (!questionText) continue;
      
      // 构建选项数组
      const options = [];
      if (optionACol >= 0 && row[optionACol]) options.push(String(row[optionACol]).trim());
      if (optionBCol >= 0 && row[optionBCol]) options.push(String(row[optionBCol]).trim());
      if (optionCCol >= 0 && row[optionCCol]) options.push(String(row[optionCCol]).trim());
      if (optionDCol >= 0 && row[optionDCol]) options.push(String(row[optionDCol]).trim());
      
      // 解析答案
      let correctAnswer = 0;
      if (answerCol >= 0 && row[answerCol]) {
        const answerText = String(row[answerCol]).trim().toUpperCase();
        if (answerText.includes('A')) correctAnswer = 0;
        else if (answerText.includes('B')) correctAnswer = 1;
        else if (answerText.includes('C')) correctAnswer = 2;
        else if (answerText.includes('D')) correctAnswer = 3;
        else if (answerText.includes('对') || answerText.includes('正确') || answerText.includes('√')) correctAnswer = 0;
        else if (answerText.includes('错') || answerText.includes('错误') || answerText.includes('×') || answerText.includes('X')) correctAnswer = 1;
        else {
          // 尝试解析数字
          const num = parseInt(answerText);
          if (!isNaN(num) && num >= 1 && num <= 4) {
            correctAnswer = num - 1;
          }
        }
      }
      
      // 解析
      let explanation = '';
      if (explanationCol >= 0 && row[explanationCol]) {
        explanation = String(row[explanationCol]).trim();
      }
      
      questions.push({
        id: `${categoryId}-${i}`,
        category: categoryId,
        type: 'single',
        question: questionText,
        options: options.length >= 2 ? options : ['正确', '错误'],
        correctAnswer,
        explanation
      });
    }
    
    console.log(`  成功解析 ${questions.length} 道题目`);
    return questions;
    
  } catch (error) {
    console.error(`  解析错误: ${error.message}`);
    return [];
  }
}

// 查找列索引
function findColumnIndex(headers, possibleNames) {
  for (let i = 0; i < headers.length; i++) {
    const header = String(headers[i]).toLowerCase().trim();
    for (const name of possibleNames) {
      if (header.includes(name.toLowerCase())) {
        return i;
      }
    }
  }
  return -1;
}

// 主函数
function main() {
  const baseDir = path.join(__dirname, '..');
  const dataDir = path.join(baseDir, 'public', 'data');
  
  // 确保数据目录存在
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  // 存储所有题目
  let allQuestions = [];
  
  // 解析每个题库文件
  for (const bank of questionBanks) {
    const filePath = path.join(baseDir, bank.file);
    
    if (!fs.existsSync(filePath)) {
      console.log(`文件不存在: ${bank.file}`);
      continue;
    }
    
    const questions = parseExcelFile(filePath, bank.id);
    allQuestions = allQuestions.concat(questions);
    
    // 保存分类数据
    const categoryData = {
      id: bank.id,
      name: bank.name,
      totalQuestions: questions.length,
      questions: questions
    };
    
    fs.writeFileSync(
      path.join(dataDir, `${bank.id}.json`),
      JSON.stringify(categoryData, null, 2)
    );
    
    console.log(`已保存: ${bank.id}.json (${questions.length} 题)`);
  }
  
  // 保存所有题目汇总
  const allData = {
    categories: questionBanks.map(b => ({ id: b.id, name: b.name })),
    totalQuestions: allQuestions.length,
    allQuestions: allQuestions
  };
  
  fs.writeFileSync(
    path.join(dataDir, 'all.json'),
    JSON.stringify(allData, null, 2)
  );
  
  console.log(`\n✅ 解析完成！共处理 ${allQuestions.length} 道题目`);
  console.log(`📁 数据已保存到: ${dataDir}`);
}

// 运行主函数
main();
