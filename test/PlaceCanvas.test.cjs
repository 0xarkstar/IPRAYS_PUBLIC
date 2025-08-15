const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PlaceCanvas", function () {
  let placeCanvas;
  let owner;
  let user1;
  let user2;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();
    
    const PlaceCanvas = await ethers.getContractFactory("PlaceCanvas");
    placeCanvas = await PlaceCanvas.deploy(ethers.parseEther("0.001"));
  });

  describe("배포", function () {
    it("올바른 초기값으로 배포되어야 함", async function () {
      expect(await placeCanvas.CANVAS_SIZE()).to.equal(1024);
      expect(await placeCanvas.pixelPrice()).to.equal(ethers.parseEther("0.001"));
      expect(await placeCanvas.fundingPool()).to.equal(0);
    });

    it("소유자가 올바르게 설정되어야 함", async function () {
      expect(await placeCanvas.owner()).to.equal(owner.address);
    });
  });

  describe("픽셀 배치", function () {
    it("올바른 가격으로 픽셀을 배치할 수 있어야 함", async function () {
      const x = 100;
      const y = 100;
      const color = "0xFF0000";
      const irysTxId = "test-tx-id";

      await placeCanvas.connect(user1).placePixel(x, y, color, irysTxId, {
        value: ethers.parseEther("0.001")
      });

      const pixel = await placeCanvas.getPixel(x, y);
      expect(pixel.color).to.equal(color);
      expect(pixel.placedBy).to.equal(user1.address);
      expect(pixel.irysTxId).to.equal(irysTxId);
      expect(pixel.isProgrammableData).to.equal(false);
    });

    it("부족한 가격으로 픽셀 배치 시 실패해야 함", async function () {
      const x = 100;
      const y = 100;
      const color = "0xFF0000";
      const irysTxId = "test-tx-id";

      await expect(
        placeCanvas.connect(user1).placePixel(x, y, color, irysTxId, {
          value: ethers.parseEther("0.0005")
        })
      ).to.be.revertedWith("Insufficient payment for pixel placement");
    });

    it("캔버스 범위를 벗어난 픽셀 배치 시 실패해야 함", async function () {
      const x = 1025; // 1024를 초과
      const y = 100;
      const color = "0xFF0000";
      const irysTxId = "test-tx-id";

      await expect(
        placeCanvas.connect(user1).placePixel(x, y, color, irysTxId, {
          value: ethers.parseEther("0.001")
        })
      ).to.be.revertedWith("Pixel outside canvas bounds");
    });
  });

  describe("펀딩 풀", function () {
    it("픽셀 배치 시 펀딩 풀에 토큰이 추가되어야 함", async function () {
      const x = 100;
      const y = 100;
      const color = "0xFF0000";
      const irysTxId = "test-tx-id";

      await placeCanvas.connect(user1).placePixel(x, y, color, irysTxId, {
        value: ethers.parseEther("0.001")
      });

      expect(await placeCanvas.fundingPool()).to.equal(ethers.parseEther("0.001"));
    });

    it("펀딩 기여가 가능해야 함", async function () {
      const contributionAmount = ethers.parseEther("0.1");
      
      await placeCanvas.connect(user1).contributeToFunding({
        value: contributionAmount
      });

      expect(await placeCanvas.fundingPool()).to.equal(contributionAmount);
    });
  });

  describe("Programmable Data", function () {
    it("Programmable Data 함수가 존재해야 함", async function () {
      expect(typeof placeCanvas.placePixelWithProgrammableData).to.equal("function");
      expect(typeof placeCanvas.placePixelWithProgrammableDataLegacy).to.equal("function");
    });
  });

  describe("관리자 기능", function () {
    it("소유자만 픽셀 가격을 변경할 수 있어야 함", async function () {
      const newPrice = ethers.parseEther("0.002");
      
      await placeCanvas.connect(owner).setPixelPrice(newPrice);
      expect(await placeCanvas.pixelPrice()).to.equal(newPrice);
    });

    it("일반 사용자는 픽셀 가격을 변경할 수 없어야 함", async function () {
      const newPrice = ethers.parseEther("0.002");
      
      await expect(
        placeCanvas.connect(user1).setPixelPrice(newPrice)
      ).to.be.revertedWithCustomError(placeCanvas, "OwnableUnauthorizedAccount");
    });

    it("소유자만 펀딩 풀에서 인출할 수 있어야 함", async function () {
      // 먼저 펀딩 풀에 토큰 추가
      await placeCanvas.connect(user1).contributeToFunding({
        value: ethers.parseEther("0.1")
      });

      const initialBalance = await ethers.provider.getBalance(owner.address);
      await placeCanvas.connect(owner).withdrawFunds(ethers.parseEther("0.05"));
      const finalBalance = await ethers.provider.getBalance(owner.address);

      expect(finalBalance).to.be.gt(initialBalance);
    });
  });
});
