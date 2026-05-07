---
title: "2.3.3 恰好型滑动窗口"
date: 2026-05-07
draft: false
tags:
  - LeetCode
  - 0x3F
  - 算法
  - 滑动窗口
---

恰好型约束常用“至多 k”转化：恰好 k = 至多 k - 至多 k - 1。

<figure class="algo-figure algo-figure--wide">
  <div class="algo-figure__viewport">
    <img src="/post/computer-science/LeetCode/0x3F/滑动窗口/二、不定长滑动窗口/2%203%20求子数组个数/2%203%203%20恰好型滑动窗口/image.png" alt="恰好型滑动窗口转化图" loading="lazy" decoding="async">
  </div>
  <figcaption>恰好型滑动窗口：把难直接维护的“恰好”拆成两个“至多”问题相减。</figcaption>
</figure>

## 1. [Binary Subarrays With Sum](https://leetcode.cn/problems/binary-subarrays-with-sum/description/)

```cpp
class Solution {
    int solve(vector<int>& nums, int goal) {
        int ans = 0;
        int sum = 0;
        int l = 0, n = nums.size();
        for(int r = 0; r < n; r++){
            sum += nums[r];

            while(l <= r && sum >= goal){
                sum -= nums[l];
                l++;
            }

            ans += l;
        }
        return ans;
    }

public:
    int numSubarraysWithSum(vector<int>& nums, int goal) {
        return solve(nums, goal) - solve(nums, goal + 1);
    }
};
```

## 2. [Count Number Of Nice Subarrays](https://leetcode.cn/problems/count-number-of-nice-subarrays/description/)

```cpp
class Solution {
    int solve(vector<int>& nums, int k){
        int ans = 0;
        int cnt = 0;
        int l = 0, n = nums.size();
        for(int r = 0; r < n; r++){
            if(nums[r] % 2 == 1){
                cnt++;
            }

            while(l <= r && cnt >= k){
                if(nums[l] % 2 == 1){
                    cnt--;
                }
                l++;
            }

            ans += l;
        }
        return ans;
    }
public:
    int numberOfSubarrays(vector<int>& nums, int k) {
        return solve(nums, k) - solve(nums, k + 1);
    }
};
```

## 3. [Count Of Substrings Containing Every Vowel And K Consonants II](https://leetcode.cn/problems/count-of-substrings-containing-every-vowel-and-k-consonants-ii/description/)

```cpp
class Solution {
    long long solve(string s, int k){
        long long ans = 0;
        map<char, int> vowel;
        int cnt = 0;
        int l = 0, n = s.length();
        for(int r = 0; r < n; r++){
            if(s[r] == 'a' || s[r] == 'e' || s[r] == 'i' || s[r] == 'o' || s[r] == 'u'){
                vowel[s[r]]++;
            }else{
                cnt++;
            }

            while(vowel.size() == 5 && l <= r && cnt >= k){
                if(s[l] == 'a' || s[l] == 'e' || s[l] == 'i' || s[l] == 'o' || s[l] == 'u'){
                    vowel[s[l]]--;
                    if(vowel[s[l]] == 0){
                        vowel.erase(s[l]);
                    }
                }else{
                    cnt--;
                }
                l++;
            }

            ans += l;
        }
        return ans;
    }

public:
    long long countOfSubstrings(string word, int k) {
        return solve(word, k) - solve(word, k + 1);
    }
};
```

## 4. [Subarrays With K Different Integers](https://leetcode.cn/problems/subarrays-with-k-different-integers/description/)

```cpp
class Solution {
    int solve(vector<int>& nums, int k){
        int ans = 0;
        map<int, int> m;
        int l = 0, n = nums.size();
        for(int r = 0; r < n; r++){
            m[nums[r]]++;

            while(m.size() >= k){
                m[nums[l]]--;
                if(m[nums[l]] == 0){
                    m.erase(nums[l]);
                }
                l++;
            }

            ans += l;
        }
        return ans;
    }

public:
    int subarraysWithKDistinct(vector<int>& nums, int k) {
        return solve(nums, k) - solve(nums, k + 1);
    }
};
```
